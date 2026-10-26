// 个人档案页面
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProfilePage = () => {
  const [profile, setProfile] = useState({
    name: '', school: '', major: '', grade: '', city: '',
    jobIntent: '', email: '', phone: '', bio: ''
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    axios.get('/api/profile').then(res => setProfile(res.data));
  }, []);

  const handleSave = () => {
    axios.put('/api/profile', profile).then(() => setEditing(false));
  };

  return (
    <div className="profile-page">
      <h1>个人档案</h1>
      {editing ? (
        <div className="profile-form">
          <input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} placeholder="姓名" />
          <input value={profile.school} onChange={e => setProfile({...profile, school: e.target.value})} placeholder="学校" />
          <input value={profile.major} onChange={e => setProfile({...profile, major: e.target.value})} placeholder="专业" />
          <button onClick={handleSave}>保存</button>
        </div>
      ) : (
        <div className="profile-info">
          <p>姓名: {profile.name}</p>
          <p>学校: {profile.school}</p>
          <p>专业: {profile.major}</p>
          <button onClick={() => setEditing(true)}>编辑</button>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
