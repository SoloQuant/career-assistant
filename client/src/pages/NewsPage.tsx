// 新闻资讯页面
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NewsPage = () => {
  const [news, setNews] = useState([]);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    axios.get('/api/news', { params: { category } }).then(res => setNews(res.data));
  }, [category]);

  return (
    <div className="news-page">
      <h1>新闻资讯</h1>
      <div className="news-tabs">
        <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>全部</button>
        <button className={category === 'finance' ? 'active' : ''} onClick={() => setCategory('finance')}>财经</button>
        <button className={category === 'important' ? 'active' : ''} onClick={() => setCategory('important')}>重要消息</button>
      </div>
      <div className="news-list">
        {news.map(article => (
          <div key={article.id} className="news-card">
            <h3>{article.title}</h3>
            <p className="news-meta">{article.source} | {article.publishTime}</p>
            <p className="news-summary">{article.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsPage;
