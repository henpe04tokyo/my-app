// Home.jsx
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [groups, setGroups] = useState([]);

  // グループ一覧を読み込む
  useEffect(() => {
    const fetchGroups = async () => {
      const snapshot = await getDocs(collection(db, 'groups'));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(data);
    };
    fetchGroups();
  }, []);

  // 新しいグループを作成してFirebaseに保存
  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    const newGroup = {
      name: groupName.trim(),
      createdAt: new Date().toISOString()
    };
    try {
      const docRef = await addDoc(collection(db, 'groups'), newGroup);
      console.log('Created group with ID: ', docRef.id);
      // 作成後、そのグループページに遷移
      navigate(`/group/${docRef.id}`);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>トップページ（グループ一覧）</h1>

      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
        <h2>新しいグループを作成</h2>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="グループ名"
          style={{ width: '100%', padding: '8px', fontSize: '16px' }}
        />
        <button
          onClick={handleCreateGroup}
          style={{ padding: '8px 16px', marginTop: '10px', fontSize: '16px' }}
        >
          作成
        </button>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '15px' }}>
        <h2>既存グループ一覧</h2>
        {groups.length === 0 && <p>グループがありません。</p>}
        <ul>
          {groups.map((g) => (
            <li key={g.id} style={{ marginBottom: '8px' }}>
              <button
                onClick={() => navigate(`/group/${g.id}`)}
                style={{ padding: '6px 12px', fontSize: '16px' }}
              >
                {g.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Home;
