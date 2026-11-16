import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SimpleTaskList from './SimpleTaskList';
import TaskGroupList from './TaskGroupList';

const TasksPage = () => {
  const [activeTab, setActiveTab] = useState<'simple' | 'group'>('simple');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'simple' | 'group')}>
        <TabsList className="mb-2">
          <TabsTrigger value="simple">简单任务</TabsTrigger>
          <TabsTrigger value="group">总任务</TabsTrigger>
        </TabsList>
        <TabsContent value="simple">
          <SimpleTaskList />
        </TabsContent>
        <TabsContent value="group">
          <TaskGroupList />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default TasksPage;
