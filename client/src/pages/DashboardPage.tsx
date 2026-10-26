// 数据看板页面
import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';

const DashboardPage = () => {
  const [radarData, setRadarData] = useState({});
  const [stats, setStats] = useState({});

  useEffect(() => {
    axios.get('/api/dashboard').then(res => {
      setRadarData(res.data.radar);
      setStats(res.data.stats);
    });
  }, []);

  const radarOption = {
    title: { text: '技能雷达图' },
    tooltip: {},
    radar: {
      indicator: [
        { name: '编程语言', max: 100 },
        { name: '数据库', max: 100 },
        { name: '大数据', max: 100 },
        { name: '人工智能', max: 100 },
        { name: '金融', max: 100 }
      ]
    },
    series: [{
      type: 'radar',
      data: [{ value: [80, 70, 85, 60, 50], name: '当前技能' }]
    }]
  };

  return (
    <div className="dashboard-page">
      <h1>数据看板</h1>
      <div className="stats-cards">
        <div className="stat-card">
          <h3>技能总数</h3>
          <p>{stats.skillCount || 0}</p>
        </div>
        <div className="stat-card">
          <h3>任务完成率</h3>
          <p>{stats.taskCompletionRate || 0}%</p>
        </div>
        <div className="stat-card">
          <h3>投递数</h3>
          <p>{stats.applicationCount || 0}</p>
        </div>
      </div>
      <ReactECharts option={radarOption} style={{ height: 400 }} />
    </div>
  );
};

export default DashboardPage;
