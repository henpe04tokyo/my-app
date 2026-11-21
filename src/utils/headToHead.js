// 対戦相性（メインプレイヤー × 相手）の集計。保存データは変更しない純関数。
//
// - 半荘pt: 保存済みの finalScores（rank1〜rank4 = 1〜4人目のプレイヤー列）をそのまま使う
// - チップ: グループ単位の値（(枚数-20)×配点/100）。相手と同じグループにいれば、そのグループのチップを計上する
// - mode "self": 同卓したときのメインプレイヤーの合計
// - mode "diff": 直接対決の差（メイン − 相手）の合計

const chipBonusOf = (group, index) => {
  const distribution = Number(group.settings?.chipDistribution) || 300;
  const raw = group.chipRow?.[`rank${index + 1}`];
  const chips = raw !== undefined && raw !== '' && !Number.isNaN(Number(raw)) ? Number(raw) : 20;
  return ((chips - 20) * distribution) / 100;
};

const playerIndexes = (group) => {
  const map = {};
  (group.players || []).forEach((p, i) => {
    const name = typeof p === 'string' ? p.trim() : '';
    if (name && map[name] === undefined) map[name] = i;
  });
  return map;
};

/** メインプレイヤーと同卓したことのある相手を、同卓半荘数の多い順で返す */
export function listOpponents(groups, mainPlayer) {
  return computeHeadToHead(groups, mainPlayer).map(({ name, games }) => ({ name, games }));
}

/**
 * @returns {Array<{name, games, groups, self:{pt,chip}, diff:{pt,chip}}>} 同卓半荘数の多い順
 */
export function computeHeadToHead(groups, mainPlayer) {
  if (!mainPlayer) return [];
  const result = {};

  (groups || []).forEach((group) => {
    const idx = playerIndexes(group);
    const mi = idx[mainPlayer];
    if (mi === undefined) return;
    const mainChip = chipBonusOf(group, mi);

    Object.entries(idx).forEach(([name, oi]) => {
      if (name === mainPlayer) return;
      const r = (result[name] ||= {
        name, games: 0, groups: 0,
        self: { pt: 0, chip: 0 },
        diff: { pt: 0, chip: 0 },
      });
      let played = 0;
      (group.games || []).forEach((game) => {
        const fs = game?.finalScores;
        const m = fs?.[`rank${mi + 1}`];
        const o = fs?.[`rank${oi + 1}`];
        if (typeof m !== 'number' || typeof o !== 'number') return;
        played += 1;
        r.self.pt += m;
        r.diff.pt += m - o;
      });
      if (played === 0) return; // 半荘が無いグループはチップも数えない
      r.games += played;
      r.groups += 1;
      const oppChip = chipBonusOf(group, oi);
      r.self.chip += mainChip;
      r.diff.chip += mainChip - oppChip;
    });
  });

  const round1 = (v) => Math.round(v * 10) / 10;
  return Object.values(result)
    .filter((r) => r.games > 0)
    .map((r) => ({
      ...r,
      self: { pt: round1(r.self.pt), chip: round1(r.self.chip) },
      diff: { pt: round1(r.diff.pt), chip: round1(r.diff.chip) },
    }))
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name, 'ja'));
}
