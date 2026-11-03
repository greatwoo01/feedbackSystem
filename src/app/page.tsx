'use client';

import { useState } from 'react';
import { TeachersManagement } from '@/components/TeachersManagement';
import { StudentsManagement } from '@/components/StudentsManagement';
import { ClassesManagement } from '@/components/ClassesManagement';
import { FeedbackManagement } from '@/components/FeedbackManagement';
import { TopNav } from '@/components/TopNav';

type TabType = 'teachers' | 'students' | 'classes' | 'feedback';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('feedback');

  const renderContent = () => {
    switch (activeTab) {
      case 'teachers':
        return <TeachersManagement />;
      case 'students':
        return <StudentsManagement />;
      case 'classes':
        return <ClassesManagement />;
      case 'feedback':
        return <FeedbackManagement />;
      default:
        return <FeedbackManagement />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部水平导航 */}
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 内容区 */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
