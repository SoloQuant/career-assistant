// 岗位推荐页面
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const JobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({ city: '', type: '', source: '' });

  useEffect(() => {
    axios.get('/api/jobs', { params: filters }).then(res => setJobs(res.data));
  }, [filters]);

  return (
    <div className="jobs-page">
      <h1>岗位推荐</h1>
      <div className="filters">
        <input placeholder="城市" value={filters.city} onChange={e => setFilters({...filters, city: e.target.value})} />
        <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
          <option value="">全部类型</option>
          <option value="fulltime">全职</option>
          <option value="campus">校招</option>
          <option value="autumn">秋招</option>
          <option value="intern">实习</option>
        </select>
        <select value={filters.source} onChange={e => setFilters({...filters, source: e.target.value})}>
          <option value="">全部来源</option>
          <option value="boss">BOSS直聘</option>
          <option value="lagou">拉勾网</option>
          <option value="zhilian">智联招聘</option>
          <option value="51job">前程无忧</option>
          <option value="24365">中国大学生就业平台</option>
        </select>
      </div>
      <div className="job-list">
        {jobs.map(job => (
          <div key={job.id} className="job-card">
            <h3>{job.title}</h3>
            <p>{job.company} | {job.city}</p>
            <p>薪资: {job.salary}</p>
            <p>来源: {job.source}</p>
            <p>类型: {job.type}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobsPage;
