'use client';

import { GraduationCap, Users, BookOpen, MessageSquare } from 'lucide-react';

type TabType = 'teachers' | 'students' | 'classes' | 'feedback';

interface TopNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs = [
  { id: 'feedback' as const, label: '课后反馈', icon: MessageSquare },
  { id: 'students' as const, label: '学生管理', icon: GraduationCap },
  { id: 'classes' as const, label: '班级管理', icon: BookOpen },
  { id: 'teachers' as const, label: '教师管理', icon: Users },
];

export function TopNav({ activeTab, onTabChange }: TopNavProps) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="flex items-center h-14 px-4 md:px-6">
        {/* Logo */}
        <div className="flex-shrink-0 mr-6 md:mr-10">
          <h1 className="text-lg font-bold text-gray-800">学生反馈系统</h1>
        </div>

        {/* 水平菜单 */}
        <nav className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  transition-colors whitespace-nowrap
                  ${isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
