'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Users, UserPlus, UserMinus } from 'lucide-react';

interface Class {
  id: number;
  name: string;
  teacher_id?: number;
  created_at: string;
  updated_at?: string;
  teachers?: {
    id: number;
    name: string;
  };
}

interface Teacher {
  id: number;
  name: string;
}

interface Student {
  id: number;
  name: string;
  gender: string;
  grade?: string;
  class_id?: number;
  classes?: {
    id: number;
    name: string;
  };
}

export function ClassesManagement() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [selectedClassStudents, setSelectedClassStudents] = useState<Student[]>([]);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [currentClassId, setCurrentClassId] = useState<number | null>(null);
  const [selectedStudentsToAdd, setSelectedStudentsToAdd] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    teacher_id: '',
  });

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const result = await response.json();
      if (response.ok) {
        setClasses(result.data || []);
      } else {
        alert(result.error || '获取班级列表失败');
      }
    } catch {
      alert('获取班级列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/teachers');
      const result = await response.json();
      if (response.ok) {
        setTeachers(result.data || []);
      }
    } catch {
      console.error('获取教师列表失败');
    }
  };

  const fetchAllStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const result = await response.json();
      if (response.ok) {
        setAllStudents(result.data || []);
      }
    } catch {
      console.error('获取学生列表失败');
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchAllStudents();
  }, []);

  const fetchClassStudents = async (classId: number, className: string) => {
    try {
      const response = await fetch('/api/students');
      const result = await response.json();
      if (response.ok) {
        const students = result.data.filter((s: Student) => s.class_id === classId);
        setSelectedClassStudents(students);
        setSelectedClassName(className);
        setCurrentClassId(classId);
        setShowStudentsModal(true);
      }
    } catch {
      alert('获取班级学生失败');
    }
  };

  // 获取可添加到班级的学生（不在本班的学生）
  const fetchAvailableStudents = async (classId: number) => {
    try {
      const response = await fetch('/api/students');
      const result = await response.json();
      if (response.ok) {
        // 过滤出不在该班级的学生
        const availableStudents = result.data.filter((s: Student) => s.class_id !== classId);
        setAllStudents(availableStudents);
        setSelectedStudentsToAdd([]);
        setShowAddStudentsModal(true);
      }
    } catch {
      alert('获取可添加学生失败');
    }
  };

  // 添加学生到班级
  const handleAddStudentsToClass = async () => {
    if (selectedStudentsToAdd.length === 0) {
      alert('请选择要添加的学生');
      return;
    }

    try {
      const promises = selectedStudentsToAdd.map(studentId =>
        fetch('/api/students', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: studentId,
            class_id: currentClassId,
          }),
        })
      );

      const results = await Promise.all(promises);
      const failedResults = results.filter(r => !r.ok);

      if (failedResults.length > 0) {
        alert(`${failedResults.length} 个学生添加失败`);
      } else {
        alert(`成功添加 ${selectedStudentsToAdd.length} 个学生到班级`);
      }

      // 刷新学生列表
      fetchAllStudents();
      if (currentClassId) {
        const className = classes.find(c => c.id === currentClassId)?.name || selectedClassName;
        fetchClassStudents(currentClassId, className);
      }
      setShowAddStudentsModal(false);
      setSelectedStudentsToAdd([]);
    } catch {
      alert('添加学生失败');
    }
  };

  // 从班级移除学生
  const handleRemoveStudentFromClass = async (studentId: number) => {
    if (!confirm('确定要将该学生从本班移除吗？')) return;

    try {
      const response = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: studentId,
          class_id: null,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        alert('学生已从本班移除');
        // 刷新学生列表
        if (currentClassId) {
          const className = classes.find(c => c.id === currentClassId)?.name || selectedClassName;
          fetchClassStudents(currentClassId, className);
        }
        fetchAllStudents();
      } else {
        alert(result.error || '移除失败');
      }
    } catch {
      alert('移除学生失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = '/api/classes';
      const method = editingClass ? 'PUT' : 'POST';
      const body = editingClass 
        ? { 
            ...formData, 
            id: editingClass.id,
            teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null 
          }
        : { 
            ...formData,
            teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null 
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      
      if (response.ok) {
        fetchClasses();
        handleCloseModal();
      } else {
        alert(result.error || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('将移入回收站（可恢复），确定要删除这个班级吗？该班级的历史反馈会保留。')) return;

    try {
      const response = await fetch(`/api/classes?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (response.ok) {
        fetchClasses();
      } else {
        alert(result.error || '删除失败');
      }
    } catch {
      alert('删除失败');
    }
  };

  const handleEdit = (cls: Class) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      teacher_id: cls.teacher_id ? cls.teacher_id.toString() : '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClass(null);
    setFormData({ name: '', teacher_id: '' });
  };

  if (loading) {
    return <div className="text-center py-10">加载中...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">班级管理</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          添加班级
        </button>
      </div>

      {/* 班级列表 - 响应式 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* 桌面端表格 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  班级名称
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  所属老师
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-gray-50">
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{cls.name}</div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {cls.teachers?.name || '-'}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(cls.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => fetchClassStudents(cls.id, cls.name)}
                      className="text-green-600 hover:text-green-900 mr-2 sm:mr-4"
                      title="管理学生"
                    >
                      <Users className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleEdit(cls)}
                      className="text-blue-600 hover:text-blue-900 mr-2 sm:mr-4"
                    >
                      <Edit2 className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(cls.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
              {classes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 lg:px-6 py-10 text-center text-gray-500">
                    暂无班级数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 移动端卡片列表 */}
        <div className="md:hidden divide-y divide-gray-200">
          {classes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无班级数据</div>
          ) : (
            classes.map((cls) => (
              <div key={cls.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">{cls.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      老师：{cls.teachers?.name || '-'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      创建于 {new Date(cls.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchClassStudents(cls.id, cls.name)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      title="管理学生"
                    >
                      <Users className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(cls)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cls.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 添加/编辑班级弹窗 - 响应式 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingClass ? '编辑班级' : '添加班级'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    班级名称 <span className="text-red-500">*</span>
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
                    所属老师
                  </label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择老师</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
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
                  {editingClass ? '更新' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 班级学生列表弹窗 - 响应式 */}
      {showStudentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {selectedClassName} - 学生列表
              </h3>
              <button 
                onClick={() => setShowStudentsModal(false)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 添加学生按钮 */}
            <div className="mb-4">
              <button
                onClick={() => currentClassId && fetchAvailableStudents(currentClassId)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                添加学生到本班
              </button>
            </div>
            
            {selectedClassStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        姓名
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        性别
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        年级
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedClassStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-3 text-sm">{student.name}</td>
                        <td className="px-4 py-3 text-sm">{student.gender}</td>
                        <td className="px-4 py-3 text-sm">{student.grade || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemoveStudentFromClass(student.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="从本班移除"
                          >
                            <UserMinus className="w-4 h-4" />
                            <span className="hidden sm:inline">移除</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                该班级暂无学生
              </div>
            )}
          </div>
        </div>
      )}

      {/* 添加学生弹窗 - 响应式 */}
      {showAddStudentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                添加学生到 {selectedClassName}
              </h3>
              <button 
                onClick={() => {
                  setShowAddStudentsModal(false);
                  setSelectedStudentsToAdd([]);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              请选择要添加到本班的学生（当前已选择 {selectedStudentsToAdd.length} 位）
            </p>
            
            {allStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                        选择
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        姓名
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        性别
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        年级
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        当前班级
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {allStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedStudentsToAdd.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentsToAdd([...selectedStudentsToAdd, student.id]);
                              } else {
                                setSelectedStudentsToAdd(selectedStudentsToAdd.filter(id => id !== student.id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">{student.name}</td>
                        <td className="px-4 py-3 text-sm">{student.gender}</td>
                        <td className="px-4 py-3 text-sm">{student.grade || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {student.classes?.name || '未分配'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暂无可添加的学生（所有学生都已在班级中）
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddStudentsModal(false);
                  setSelectedStudentsToAdd([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddStudentsToClass}
                disabled={selectedStudentsToAdd.length === 0}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                确认添加 ({selectedStudentsToAdd.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
