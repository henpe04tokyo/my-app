// src/hooks/useGameManager.js
// ゲームスコアの管理と永続化を担当するカスタムフック

import { useState, useEffect } from 'react';
import { recalcFinalStats, calculateFinalScoresFromInputs } from '../utils/scoreCalculation';

/**
 * ゲームデータ管理のためのカスタムフック
 * @param {Object} options - 設定オプション
 * @param {Object} options.currentGroup - 現在のグループデータ
 * @param {Function} options.setCurrentGroup - グループ状態更新関数
 * @param {Array} options.players - プレイヤー配列
 * @param {Function} options.updateGroupInFirebase - Firebase更新関数
 * @returns {Object} ゲーム管理機能
 */
export function useGameManager({ 
  currentGroup,
  setCurrentGroup,
  players,
  updateGroupInFirebase
}) {
  // ゲームスコア入力フォームの状態
  const [currentGameScore, setCurrentGameScore] = useState({
    rank1: '',
    rank2: '',
    rank3: '',
    rank4: ''
  });
  
  // チップ入力の状態
  const [chipRow, setChipRow] = useState({
    rank1: '',
    rank2: '',
    rank3: '',
    rank4: ''
  });
  
  // 保存状態とエラー
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  
  // ローカルストレージのキー
  const GAME_SCORE_STORAGE_KEY = currentGroup?.docId 
    ? `game_score_input_${currentGroup.docId}` 
    : null;
  
  const CHIP_ROW_STORAGE_KEY = currentGroup?.docId 
    ? `chip_row_${currentGroup.docId}` 
    : null;

  // グループデータが変更されたとき、チップ行のデータをロード
  useEffect(() => {
    if (currentGroup && currentGroup.chipRow) {
      setChipRow(currentGroup.chipRow);
    } else {
      setChipRow({
        rank1: '',
        rank2: '',
        rank3: '',
        rank4: ''
      });
    }
  }, [currentGroup]);

  // 進行中のゲームスコアをローカルストレージに保存
  useEffect(() => {
    if (GAME_SCORE_STORAGE_KEY && Object.values(currentGameScore).some(val => val !== '')) {
      localStorage.setItem(GAME_SCORE_STORAGE_KEY, JSON.stringify(currentGameScore));
    }
  }, [currentGameScore, GAME_SCORE_STORAGE_KEY]);

  // チップ行の状態をローカルストレージに保存
  useEffect(() => {
    if (CHIP_ROW_STORAGE_KEY && Object.values(chipRow).some(val => val !== '')) {
      localStorage.setItem(CHIP_ROW_STORAGE_KEY, JSON.stringify(chipRow));
    }
  }, [chipRow, CHIP_ROW_STORAGE_KEY]);

  // コンポーネントマウント時にローカルストレージからデータを復元
  useEffect(() => {
    // ゲームスコア復元
    if (GAME_SCORE_STORAGE_KEY) {
      try {
        const savedScore = localStorage.getItem(GAME_SCORE_STORAGE_KEY);
        if (savedScore) {
          const parsedScore = JSON.parse(savedScore);
          setCurrentGameScore(parsedScore);
        }
      } catch (error) {
        console.warn('ゲームスコア復元エラー:', error);
      }
    }
    
    // チップ行復元
    if (CHIP_ROW_STORAGE_KEY) {
      try {
        const savedChipRow = localStorage.getItem(CHIP_ROW_STORAGE_KEY);
        if (savedChipRow) {
          const parsedChipRow = JSON.parse(savedChipRow);
          setChipRow(parsedChipRow);
        }
      } catch (error) {
        console.warn('チップ行復元エラー:', error);
      }
    }
  }, [GAME_SCORE_STORAGE_KEY, CHIP_ROW_STORAGE_KEY]);

  /**
   * ゲームスコアの検証
   * @returns {boolean} 有効性
   */
  const validateGameScore = () => {
    const { rank1, rank2, rank3, rank4 } = currentGameScore;
    
    // 空のチェック
    if ([rank1, rank2, rank3, rank4].some(v => v === '')) {
      setSaveError('すべてのプレイヤーのスコアを入力してください');
      return false;
    }
    
    // 数値変換チェック
    const scores = [rank1, rank2, rank3, rank4].map(v => Number(v));
    if (scores.some(v => isNaN(v))) {
      setSaveError('スコアは数値で入力してください');
      return false;
    }
    
    // 合計チェック (100000点が基準)
    const total = scores.reduce((sum, score) => sum + score, 0);
    if (Math.abs(total - 100000) > 1000) { // 1000点の誤差は許容
      setSaveError(`合計点が ${total} 点です。100,000点に近い値になるように調整してください`);
      return false;
    }
    
    return true;
  };

  /**
   * ゲームスコアを追加
   * @returns {Promise<boolean>} 成功したかどうか
   */
  const addGameScore = async () => {
    if (!currentGroup) {
      setSaveError('グループデータがありません');
      return false;
    }
    
    // バリデーション
    if (!validateGameScore()) {
      return false;
    }
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // 現在のグループの順位点設定を取得
      const rankPoints = currentGroup.settings?.rankPoints || [0, 10, -10, -30];
      
      // 持ち点から最終スコアを計算
      const finalScoresObj = calculateFinalScoresFromInputs(currentGameScore, rankPoints);
      const finalScores = {
        rank1: finalScoresObj[0],
        rank2: finalScoresObj[1],
        rank3: finalScoresObj[2],
        rank4: finalScoresObj[3]
      };
      
      // 新しいゲームオブジェクト
      const gameId = Date.now();
      const newGame = {
        id: gameId,
        createdAt: new Date().toISOString(),
        inputScores: {
          rank1: Number(currentGameScore.rank1),
          rank2: Number(currentGameScore.rank2),
          rank3: Number(currentGameScore.rank3),
          rank4: Number(currentGameScore.rank4)
        },
        finalScores
      };
      
      // 順位回数カウントの更新
      const updatedRankingCounts = { ...currentGroup.rankingCounts } || {};
      
      // プレイヤーと最終スコアをマッピングした配列を作成
      const sortedPlayers = Object.keys(finalScores)
        .map((key, index) => ({
          player: players[index],
          score: finalScores[key]
        }))
        .sort((a, b) => b.score - a.score);
      
      // 得点に基づいて順位を決定し、rankingCounts を更新
      sortedPlayers.forEach((player, index) => {
        if (!player.player || !player.player.trim()) return; // 空のプレイヤー名はスキップ
        
        if (!updatedRankingCounts[player.player]) {
          updatedRankingCounts[player.player] = { "1位": 0, "2位": 0, "3位": 0, "4位": 0 };
        }
        updatedRankingCounts[player.player][`${index + 1}位`] += 1;
      });
      
      // グループデータの更新
      const updatedGames = [...(currentGroup.games || []), newGame];
      const updatedGroup = {
        ...currentGroup,
        games: updatedGames,
        rankingCounts: updatedRankingCounts
      };
      
      // 再集計して保存
      updatedGroup.finalStats = recalcFinalStats(updatedGroup);
      
      // Firestoreに保存
      await updateGroupInFirebase(updatedGroup);
      
      // 成功したらローカルストレージをクリア
      if (GAME_SCORE_STORAGE_KEY) {
        localStorage.removeItem(GAME_SCORE_STORAGE_KEY);
      }
      
      // ローカルの状態を更新
      setCurrentGroup(updatedGroup);
      setCurrentGameScore({ rank1: '', rank2: '', rank3: '', rank4: '' });
      setLastSaved(new Date());
      
      // ローカルストレージにバックアップも保存
      try {
        localStorage.setItem(`game_${gameId}_backup`, JSON.stringify(newGame));
      } catch (err) {
        console.warn('ゲームバックアップエラー:', err);
      }
      
      return true;
    } catch (error) {
      console.error('ゲーム追加エラー:', error);
      setSaveError('ゲームの保存に失敗しました。もう一度お試しください。');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * ゲームスコアを編集
   * @param {number} gameId - 編集するゲームID
   * @param {string} rankKey - 編集する順位キー
   * @param {string|number} newValue - 新しい値
   * @returns {Promise<boolean>} 成功したかどうか
   */
  const editGameScore = async (gameId, rankKey, newValue) => {
    if (!currentGroup) return false;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const numValue = Number(newValue);
      if (isNaN(numValue)) {
        setSaveError('数値を入力してください');
        return false;
      }
      
      // ゲームデータの更新
      const updatedGames = currentGroup.games.map(game => {
        if (game.id === gameId) {
          return {
            ...game,
            finalScores: {
              ...game.finalScores,
              [rankKey]: numValue
            }
          };
        }
        return game;
      });
      
      // グループデータの更新と再集計
      const updatedGroup = {
        ...currentGroup,
        games: updatedGames
      };
      updatedGroup.finalStats = recalcFinalStats(updatedGroup);
      
      // Firestoreに保存
      await updateGroupInFirebase(updatedGroup);
      
      // ローカルの状態を更新
      setCurrentGroup(updatedGroup);
      setLastSaved(new Date());
      
      return true;
    } catch (error) {
      console.error('ゲーム編集エラー:', error);
      setSaveError('ゲームの更新に失敗しました。もう一度お試しください。');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // src/hooks/useGameManager.js (続き)

  /**
   * ゲームスコアを削除
   * @param {number} gameId - 削除するゲームID
   * @returns {Promise<boolean>} 成功したかどうか
   */
  const deleteGameScore = async (gameId) => {
    if (!currentGroup) return false;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // 該当ゲームを削除
      const updatedGames = currentGroup.games.filter(game => game.id !== gameId);
      
      // 順位カウントの再計算
      const updatedRankingCounts = {};
      players.forEach(player => {
        if (player && player.trim()) {
          updatedRankingCounts[player] = { "1位": 0, "2位": 0, "3位": 0, "4位": 0 };
        }
      });
      
      // 残りのゲームから順位カウントを再集計
      updatedGames.forEach(game => {
        const sortedPlayers = Object.keys(game.finalScores)
          .map((key, index) => ({
            player: players[index],
            score: game.finalScores[key]
          }))
          .sort((a, b) => b.score - a.score);
          
        sortedPlayers.forEach((player, index) => {
          if (!player.player || !player.player.trim()) return;
          if (!updatedRankingCounts[player.player]) {
            updatedRankingCounts[player.player] = { "1位": 0, "2位": 0, "3位": 0, "4位": 0 };
          }
          updatedRankingCounts[player.player][`${index + 1}位`] += 1;
        });
      });
      
      // グループデータの更新と再集計
      const updatedGroup = {
        ...currentGroup,
        games: updatedGames,
        rankingCounts: updatedRankingCounts
      };
      updatedGroup.finalStats = recalcFinalStats(updatedGroup);
      
      // Firestoreに保存
      await updateGroupInFirebase(updatedGroup);
      
      // ローカルの状態を更新
      setCurrentGroup(updatedGroup);
      setLastSaved(new Date());
      
      return true;
    } catch (error) {
      console.error('ゲーム削除エラー:', error);
      setSaveError('ゲームの削除に失敗しました。もう一度お試しください。');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * チップ行を更新
   * @param {string} rankKey - 更新する順位キー
   * @param {string|number} newValue - 新しい値
   * @returns {Promise<boolean>} 成功したかどうか
   */
  const updateChipRow = async (rankKey, newValue) => {
    if (!currentGroup) return false;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // ローカル状態を更新
      const updatedChipRow = {
        ...chipRow,
        [rankKey]: newValue
      };
      setChipRow(updatedChipRow);
      
      // グループデータの更新
      const updatedGroup = {
        ...currentGroup,
        chipRow: updatedChipRow
      };
      
      // 再集計 (チップボーナスに影響するので必要)
      updatedGroup.finalStats = recalcFinalStats(updatedGroup);
      
      // Firestoreに保存
      await updateGroupInFirebase(updatedGroup);
      
      // ローカルの状態を更新
      setCurrentGroup(updatedGroup);
      setLastSaved(new Date());
      
      // ローカルストレージにもバックアップ
      if (CHIP_ROW_STORAGE_KEY) {
        localStorage.setItem(CHIP_ROW_STORAGE_KEY, JSON.stringify(updatedChipRow));
      }
      
      return true;
    } catch (error) {
      console.error('チップ行更新エラー:', error);
      setSaveError('チップの更新に失敗しました。もう一度お試しください。');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // ゲームスコア管理
    currentGameScore,
    setCurrentGameScore,
    addGameScore,
    editGameScore,
    deleteGameScore,
    
    // チップ行管理
    chipRow,
    setChipRow,
    updateChipRow,
    
    // 状態管理
    isSaving,
    saveError,
    lastSaved
  };
}

export default useGameManager;