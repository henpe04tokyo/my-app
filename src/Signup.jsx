// src/Signup.jsx
import React, { useState, useContext, useEffect } from 'react';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from './AuthContext';

function Signup() {
  const auth = getAuth();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  // 既にログインしている場合、会員登録ページにいる必要はないのでダッシュボードへ
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // オプション：登録後に表示名を設定
      await updateProfile(userCredential.user, { displayName });
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
      <h1>会員登録</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSignup}>
        <div>
          <input
            type="text"
            placeholder="表示名"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
        <div>
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
        <button type="submit" style={{ padding: '10px 20px', marginBottom: '10px' }}>
          会員登録
        </button>
      </form>
      <p>
        既にアカウントをお持ちですか？ <Link to="/login">ログインはこちら</Link>
      </p>
    </div>
  );
}

export default Signup;
