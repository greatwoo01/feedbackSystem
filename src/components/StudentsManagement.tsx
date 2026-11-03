'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, ChevronDown } from 'lucide-react';

// 预设年级选项
const GRADE_OPTIONS = [
  '小学一年级',
  '小学二年级',
  '小学三年级',
  '小学四年级',
  '小学五年级',
  '小学六年级',
  '初中一年级',
  '初中二年级',
  '初中三年级',
  '高中一年级',
  '高中二年级',
  '高中三年级',
];

interface Student {
  id: number;
  name: string;
  gender: string;
  parent_phone?: string;
  class_id?: number;
  birthday?: string;
  grade?: string;
  created_at: string;
  updated_at?: string;
  classes?: {
    id: number;
    name: string;
  };
}

interface Class {
  id: number;
  name: string;
}

export function StudentsManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [customGrade, setCustomGrade] = useState('');
  const [isCustomGrade, setIsCustomGrade] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gender: '男',
    parent_phone: '',
    class_id: '',
    birthday: '',
    grade: '',
  });

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const result = await response.json();
      if (response.ok) {
        setStudents(result.data || []);
      } else {
        alert(result.error || '获取学生列表失败');
      }
    } catch {
      alert('获取学生列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const result = await response.json();
      if (response.ok) {
        setClasses(result.data || []);
      }
    } catch {
      console.error('获取班级列表失败');
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';
      
      // 处理空字段，转换为 null
      const processedData = {
        name: formData.name,
        gender: formData.gender,
        parent_phone: formData.parent_phone || null,
        class_id: formData.class_id ? parseInt(formData.class_id) : null,
        birthday: formData.birthday || null,
        grade: formData.grade || null,
      };

      const body = editingStudent 
        ? { ...processedData, id: editingStudent.id }
        : processedData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      
      if (response.ok) {
        fetchStudents();
        handleCloseModal();
      } else {
        alert(result.error || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('将移入回收站（可恢复），确定要删除这位学生吗？该学生的历史反馈会保留。')) return;

    try {
      const response = await fetch(`/api/students?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (response.ok) {
        fetchStudents();
      } else {
        alert(result.error || '删除失败');
      }
    } catch {
      alert('删除失败');
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    const gradeValue = student.grade || '';
    // 判断是否为自定义年级
    const isCustom = !GRADE_OPTIONS.includes(gradeValue);
    setIsCustomGrade(isCustom);
    if (isCustom) {
      setCustomGrade(gradeValue);
    }
    setFormData({
      name: student.name,
      gender: student.gender,
      parent_phone: student.parent_phone || '',
      class_id: student.class_id ? student.class_id.toString() : '',
      birthday: student.birthday ? student.birthday.split('T')[0] : '',
      grade: gradeValue,
    });
    setShowModal(true);
  };

  const handleGradeSelect = (grade: string) => {
    if (grade === 'custom') {
      setIsCustomGrade(true);
      setCustomGrade('');
      setFormData({ ...formData, grade: '' });
    } else {
      setIsCustomGrade(false);
      setFormData({ ...formData, grade });
    }
    setShowGradeDropdown(false);
  };

  const handleCustomGradeChange = (value: string) => {
    setCustomGrade(value);
    setFormData({ ...formData, grade: value });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    setShowGradeDropdown(false);
    setIsCustomGrade(false);
    setCustomGrade('');
    setFormData({
      name: '',
      gender: '男',
      parent_phone: '',
      class_id: '',
      birthday: '',
      grade: '',
    });
  };

  if (loading) {
    return <div className="text-center py-10">加载中...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">学生管理</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          添加学生
        </button>
      </div>

      {/* 学生列表 - 响应式 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* 桌面端表格 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  姓名
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  性别
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  年级
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  班级
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  家长电话
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  生日
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{student.name}</div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{student.gender}</div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{student.grade || '-'}</div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {student.classes?.name || '-'}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{student.parent_phone || '-'}</div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.birthday ? new Date(student.birthday).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(student)}
                      className="text-blue-600 hover:text-blue-900 mr-2 sm:mr-4"
                    >
                      <Edit2 className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 lg:px-6 py-10 text-center text-gray-500">
                    暂无学生数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 移动端卡片列表 */}
        <div className="md:hidden divide-y divide-gray-200">
          {students.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无学生数据</div>
          ) : (
            students.map((student) => (
              <div key={student.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">{student.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{student.gender} · {student.grade || '无年级'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(student)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">班级：</span>
                    <span className="text-gray-900">{student.classes?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">家长电话：</span>
                    <span className="text-gray-900">{student.parent_phone || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">生日：</span>
                    <span className="text-gray-900">
                      {student.birthday ? new Date(student.birthday).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 添加/编辑学生弹窗 - 响应式 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingStudent ? '编辑学生' : '添加学生'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    性别 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    年级
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowGradeDropdown(!showGradeDropdown)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left bg-white flex items-center justify-between"
                    >
                      <span className="text-sm">
                        {isCustomGrade ? (formData.grade || '请输入自定义年级') : (formData.grade || '请选择年级')}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                    
                    {showGradeDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {GRADE_OPTIONS.map((grade) => (
                          <button
                            key={grade}
                            type="button"
                            onClick={() => handleGradeSelect(grade)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 first:rounded-t-lg"
                          >
                            {grade}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleGradeSelect('custom')}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 border-t border-gray-200 text-blue-600 last:rounded-b-lg"
                        >
                          + 自定义年级
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {isCustomGrade && (
                    <input
                      type="text"
                      value={customGrade}
                      onChange={(e) => handleCustomGradeChange(e.target.value)}
                      placeholder="请输入自定义年级"
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      autoFocus
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    所属班级
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择班级</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    家长电话
                  </label>
                  <input
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    生日
                  </label>
                  <input
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {editingStudent ? '更新' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
