// 任务管理页面（基础版）
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' });

  useEffect(() => {
    axios.get('/api/tasks').then(res => setTasks(res.data));
  }, []);

  const addTask = () => {
    axios.post('/api/tasks', newTask).then(res => {
      setTasks([...tasks, res.data]);
      setNewTask({ title: '', description: '', priority: 'medium' });
    });
  };

  const toggleTask = (id: number, completed: boolean) => {
    axios.put(`/api/tasks/${id}`, { completed: !completed }).then(() => {
      setTasks(tasks.map(t => t.id === id ? {...t, completed: !completed} : t));
    });
  };

  return (
    <div className="tasks-page">
      <h1>任务管理</h1>
      <div className="task-form">
        <input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="任务标题" />
        <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} placeholder="任务描述" />
        <button onClick={addTask}>添加任务</button>
      </div>
      <div className="task-list">
        {tasks.map(task => (
          <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
            <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id, task.completed)} />
            <h3>{task.title}</h3>
            <p>{task.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TasksPage;
