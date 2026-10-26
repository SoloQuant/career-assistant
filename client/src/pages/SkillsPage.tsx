// 技能管理页面
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SkillsPage = () => {
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState({ name: '', category: '', level: 0 });

  useEffect(() => {
    axios.get('/api/skills').then(res => setSkills(res.data));
  }, []);

  const addSkill = () => {
    axios.post('/api/skills', newSkill).then(res => {
      setSkills([...skills, res.data]);
      setNewSkill({ name: '', category: '', level: 0 });
    });
  };

  return (
    <div className="skills-page">
      <h1>技能管理</h1>
      <div className="skill-form">
        <input value={newSkill.name} onChange={e => setNewSkill({...newSkill, name: e.target.value})} placeholder="技能名称" />
        <select value={newSkill.category} onChange={e => setNewSkill({...newSkill, category: e.target.value})}>
          <option value="">选择分类</option>
          <option value="programming">编程语言</option>
          <option value="database">数据库</option>
          <option value="bigdata">大数据</option>
          <option value="ai">人工智能</option>
          <option value="finance">金融</option>
        </select>
        <input type="number" value={newSkill.level} onChange={e => setNewSkill({...newSkill, level: +e.target.value})} placeholder="掌握度(0-100)" />
        <button onClick={addSkill}>添加技能</button>
      </div>
      <div className="skill-list">
        {skills.map(skill => (
          <div key={skill.id} className="skill-item">
            <h3>{skill.name}</h3>
            <p>分类: {skill.category}</p>
            <p>掌握度: {skill.level}%</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillsPage;
