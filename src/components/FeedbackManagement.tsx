'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Eye, Star, Download, Upload, FileSpreadsheet, Filter, XCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';

interface Feedback {
  id: number;
  class_id: number;
  student_id: number;
  class_date: string;
  teaching_content?: string;
  homework_content?: string;
  homework_score?: number;
  exercise_score?: number;
  thinking_score?: number;
  performance_score?: number;
  overall_score?: number;
  evaluation: string;
  created_at: string;
  updated_at?: string;
  classes?: {
    id: number;
    name: string;
  };
  students?: {
    id: number;
    name: string;
  };
}

interface Class {
  id: number;
  name: string;
}

interface Student {
  id: number;
  name: string;
  gender: string;
  class_id?: number;
}

interface StudentEvaluation {
  homework_score: number;
  exercise_score: number;
  thinking_score: number;
  performance_score: number;
  overall_score: number;
  evaluation: string;
}

// 导入 Excel 时可识别的列名（含常见别名）
const IMPORT_HEADER_ALIASES = {
  className: ['班级名称', '班级', '班级名'],
  studentName: ['学生姓名', '学生', '姓名'],
  classDate: ['上课日期', '日期', '上课时间'],
  teachingContent: ['教学内容'],
  homeworkContent: ['课后作业', '作业内容'],
  homeworkScore: ['作业情况', '作业评分'],
  exerciseScore: ['课堂练习'],
  thinkingScore: ['编程思维'],
  performanceScore: ['课堂表现'],
  overallScore: ['综合评分'],
  evaluation: ['评价/建议', '评价', '评语', '评价建议'],
} as const;

interface ImportPayload {
  class_id: number;
  student_id: number;
  class_date: string;
  teaching_content: string | null;
  homework_content: string | null;
  homework_score: number | null;
  exercise_score: number | null;
  thinking_score: number | null;
  performance_score: number | null;
  overall_score: number | null;
  evaluation: string;
  label: string;
}

function normalizeHeader(value: string): string {
  return value.replace(/\s+/g, '').replace(/／/g, '/').replace(/（/g, '(').replace(/）/g, ')').trim();
}

function normalizeRecord(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    result[normalizeHeader(key)] = value;
  });
  return result;
}

function readField(row: Record<string, unknown>, aliases: readonly string[]): unknown {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (key in row) return row[key];
  }
  return undefined;
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const text = String(value).trim();
  return text === '' || text === '-' || text === '—';
}

function readImportText(value: unknown): string | null {
  return isBlank(value) ? null : String(value).trim();
}

function formatDateParts(year: number, month: number, day: number): string | null {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 解析日期：兼容 Date 对象、Excel 序列号、以及常见中文/斜杠/横杠写法
function parseImportDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  if (typeof value === 'number' && value > 0) {
    const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(value * 86400000));
    return formatDateParts(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
  }
  if (typeof value === 'string') {
    const text = value.trim();
    const matched = text.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
    if (matched) {
      return formatDateParts(Number(matched[1]), Number(matched[2]), Number(matched[3]));
    }
    const fallback = new Date(text);
    if (!Number.isNaN(fallback.getTime())) {
      return formatDateParts(fallback.getFullYear(), fallback.getMonth() + 1, fallback.getDate());
    }
  }
  return null;
}

// 解析评分：按 1-5 分处理，超过 5 且不超过 100 时按百分制换算
function parseImportScore(value: unknown): number | null {
  if (isBlank(value)) return null;
  const score = Number(String(value).trim());
  if (!Number.isFinite(score)) return null;
  if (score > 5 && score <= 100) {
    return Math.min(5, Math.max(1, Math.round(score / 20)));
  }
  return Math.min(5, Math.max(1, Math.round(score)));
}

export function FeedbackManagement() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewFeedback, setViewFeedback] = useState<Feedback | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState<number[]>([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    studentName: '',
    classId: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    class_id: '',
    class_date: new Date().toISOString().split('T')[0],
    teaching_content: '',
    homework_content: '',
    evaluations: {} as Record<number, StudentEvaluation>,
  });
  const feedbackContentRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const fetchFeedbacks = async () => {
    try {
      const response = await fetch('/api/feedbacks');
      const result = await response.json();
      if (response.ok) {
        setFeedbacks(result.data || []);
      } else {
        alert(result.error || '获取反馈列表失败');
      }
    } catch {
      alert('获取反馈列表失败');
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
    fetchFeedbacks();
    fetchClasses();
    fetchAllStudents();
  }, []);

  // 过滤后的反馈数据
  const filteredFeedbacks = feedbacks.filter(feedback => {
    // 日期范围筛选
    if (filters.startDate && new Date(feedback.class_date) < new Date(filters.startDate)) {
      return false;
    }
    if (filters.endDate && new Date(feedback.class_date) > new Date(filters.endDate + 'T23:59:59')) {
      return false;
    }
    // 学生姓名筛选
    if (filters.studentName && !feedback.students?.name?.toLowerCase().includes(filters.studentName.toLowerCase())) {
      return false;
    }
    // 班级筛选
    if (filters.classId && feedback.class_id !== parseInt(filters.classId)) {
      return false;
    }
    return true;
  });

  // 重置筛选
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      studentName: '',
      classId: '',
    });
  };

  // 检查是否有筛选条件
  const hasActiveFilters = filters.startDate || filters.endDate || filters.studentName || filters.classId;

  const handleClassChange = (classId: string) => {
    const students = allStudents.filter(s => s.class_id === parseInt(classId));
    setClassStudents(students);
    
    // 初始化每个学生的评分为空
    const initialEvaluations: Record<number, StudentEvaluation> = {};
    students.forEach(s => {
      initialEvaluations[s.id] = {
        homework_score: 5,
        exercise_score: 5,
        thinking_score: 5,
        performance_score: 5,
        overall_score: 5,
        evaluation: '',
      };
    });
    setFormData(prev => ({
      ...prev,
      class_id: classId,
      evaluations: initialEvaluations,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.class_id || !formData.class_date) {
      alert('请选择班级和上课日期');
      return;
    }

    try {
      // 编辑模式：更新单条反馈
      if (editingFeedback) {
        const studentId = editingFeedback.student_id;
        const evaluationData = formData.evaluations[studentId];

        if (!evaluationData?.evaluation?.trim()) {
          alert('请填写评价');
          return;
        }

        const feedbackToUpdate = {
          id: editingFeedback.id,
          class_id: parseInt(formData.class_id),
          student_id: studentId,
          class_date: formData.class_date,
          teaching_content: formData.teaching_content || null,
          homework_content: formData.homework_content || null,
          homework_score: evaluationData.homework_score || 5,
          exercise_score: evaluationData.exercise_score || 5,
          thinking_score: evaluationData.thinking_score || 5,
          performance_score: evaluationData.performance_score || 5,
          overall_score: evaluationData.overall_score || 5,
          evaluation: evaluationData.evaluation,
        };

        const response = await fetch('/api/feedbacks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedbackToUpdate),
        });

        const result = await response.json();
        if (response.ok) {
          alert('反馈更新成功');
          fetchFeedbacks();
          handleCloseModal();
        } else {
          alert(result.error || '更新失败');
        }
      } else {
        // 新增模式：批量创建反馈
        // 检查是否所有学生都有评价
        const studentsWithoutEvaluation = classStudents.filter(
          s => !formData.evaluations[s.id]?.evaluation?.trim()
        );

        if (studentsWithoutEvaluation.length > 0) {
          if (!confirm(`还有 ${studentsWithoutEvaluation.length} 位学生未填写评价，确定要提交吗？`)) {
            return;
          }
        }

        const feedbacksToCreate = classStudents
          .filter(s => formData.evaluations[s.id]?.evaluation?.trim())
          .map(s => {
            const evaluationData = formData.evaluations[s.id];
            return {
              class_id: parseInt(formData.class_id),
              student_id: s.id,
              class_date: formData.class_date,
              teaching_content: formData.teaching_content || null,
              homework_content: formData.homework_content || null,
              homework_score: evaluationData.homework_score || 5,
              exercise_score: evaluationData.exercise_score || 5,
              thinking_score: evaluationData.thinking_score || 5,
              performance_score: evaluationData.performance_score || 5,
              overall_score: evaluationData.overall_score || 5,
              evaluation: evaluationData.evaluation,
            };
          });

        if (feedbacksToCreate.length === 0) {
          alert('请至少为一个学生填写评价');
          return;
        }

        const results = await Promise.all(
          feedbacksToCreate.map(feedback =>
            fetch('/api/feedbacks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(feedback),
            })
          )
        );

        const failedResults = results.filter(r => !r.ok);
        if (failedResults.length > 0) {
          alert(`${failedResults.length} 条反馈创建失败`);
        } else {
          alert('反馈创建成功');
        }

        fetchFeedbacks();
        handleCloseModal();
      }
    } catch {
      alert('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('将移入回收站（可恢复），确定要删除这条反馈吗？')) return;

    try {
      const response = await fetch(`/api/feedbacks?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        fetchFeedbacks();
      } else {
        alert(result.error || '删除失败');
      }
    } catch {
      alert('删除失败');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFeedbackIds(feedbacks.map(f => f.id));
    } else {
      setSelectedFeedbackIds([]);
    }
  };

  const handleSelectFeedback = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedFeedbackIds([...selectedFeedbackIds, id]);
    } else {
      setSelectedFeedbackIds(selectedFeedbackIds.filter(fid => fid !== id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedFeedbackIds.length === 0) {
      alert('请先选择要删除的反馈');
      return;
    }

    if (!confirm(`将移入回收站（可恢复），确定要删除选中的 ${selectedFeedbackIds.length} 条反馈吗？`)) return;

    try {
      const results = await Promise.all(
        selectedFeedbackIds.map(id =>
          fetch(`/api/feedbacks?id=${id}`, {
            method: 'DELETE',
          })
        )
      );

      const failedResults = results.filter(r => !r.ok);
      if (failedResults.length > 0) {
        alert(`${failedResults.length} 条反馈删除失败`);
      } else {
        alert(`成功删除 ${selectedFeedbackIds.length} 条反馈`);
      }

      setSelectedFeedbackIds([]);
      fetchFeedbacks();
    } catch {
      alert('批量删除失败');
    }
  };

  const handleDownloadImage = async () => {
    console.log('开始生成图片...');
    console.log('ref.current:', feedbackContentRef.current);
    console.log('viewFeedback:', viewFeedback);

    if (!feedbackContentRef.current || !viewFeedback) {
      console.error('缺少必要的元素');
      alert('无法生成图片：缺少必要的数据');
      return;
    }

    try {
      console.log('开始调用 html-to-image...');

      // 使用 html-to-image 生成图片
      const dataUrl = await toPng(feedbackContentRef.current, {
        width: feedbackContentRef.current.offsetWidth * 1,
        height: feedbackContentRef.current.offsetHeight * 1,
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      console.log('图片生成成功');

      const link = document.createElement('a');
      const studentName = viewFeedback.students?.name || '学生';
      const dateStr = new Date(viewFeedback.class_date).toLocaleDateString();
      link.download = `反馈_${studentName}_${dateStr}.png`;
      link.href = dataUrl;
      link.click();

      console.log('图片下载已触发');
    } catch (error) {
      console.error('生成图片失败:', error);
      alert('生成图片失败，请重试');
    }
  };

  const handleExportExcel = () => {
    try {
      if (feedbacks.length === 0) {
        alert('暂无反馈数据可导出');
        return;
      }

      // 准备导出数据
      const exportData = feedbacks.map((feedback) => ({
        '班级名称': feedback.classes?.name || '-',
        '学生姓名': feedback.students?.name || '-',
        '上课日期': new Date(feedback.class_date).toLocaleDateString('zh-CN'),
        '教学内容': feedback.teaching_content || '-',
        '课后作业': feedback.homework_content || '-',
        '作业情况': feedback.homework_score || '-',
        '课堂练习': feedback.exercise_score || '-',
        '编程思维': feedback.thinking_score || '-',
        '课堂表现': feedback.performance_score || '-',
        '综合评分': feedback.overall_score || '-',
        '评价/建议': feedback.evaluation || '-',
        '创建时间': new Date(feedback.created_at).toLocaleString('zh-CN'),
      }));

      // 创建工作簿
      const wb = XLSX.utils.book_new();

      // 创建工作表
      const ws = XLSX.utils.json_to_sheet(exportData);

      // 设置列宽
      const colWidths = [
        { wch: 15 }, // 班级名称
        { wch: 15 }, // 学生姓名
        { wch: 15 }, // 上课日期
        { wch: 30 }, // 教学内容
        { wch: 30 }, // 课后作业
        { wch: 10 }, // 作业情况
        { wch: 10 }, // 课堂练习
        { wch: 10 }, // 编程思维
        { wch: 10 }, // 课堂表现
        { wch: 10 }, // 综合评分
        { wch: 40 }, // 评价/建议
        { wch: 20 }, // 创建时间
      ];
      ws['!cols'] = colWidths;

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(wb, ws, '课后反馈');

      // 生成文件名（带时间戳）
      const now = new Date();
      const timeStr = now.toISOString().slice(0, 10);
      const fileName = `课后反馈_${timeStr}.xlsx`;

      // 导出文件
      XLSX.writeFile(wb, fileName);

      console.log('Excel 导出成功');
    } catch (error) {
      console.error('导出 Excel 失败:', error);
      alert('导出 Excel 失败，请重试');
    }
  };

  // 导入历史评价（xlsx / xls），列名与「导出」保持一致
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setImporting(true);

      const buffer = await file.arrayBuffer();
      // 关闭 cellDates：日期统一保留为 Excel 序列号，由 parseImportDate 按 UTC 换算，
      // 避免 SheetJS 按本地时区解析导致日期偏差一天
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        alert('文件中没有工作表');
        return;
      }

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
        defval: '',
        raw: true,
      });
      if (rawRows.length === 0) {
        alert('文件内容为空');
        return;
      }

      // 建立班级、学生名称到 ID 的索引
      const classIdByName = new Map<string, number>();
      classes.forEach((cls) => classIdByName.set(normalizeHeader(cls.name), cls.id));

      const studentIdByClassAndName = new Map<string, number>();
      const studentIdsByName = new Map<string, number[]>();
      allStudents.forEach((student) => {
        if (student.class_id) {
          studentIdByClassAndName.set(`${student.class_id}|${normalizeHeader(student.name)}`, student.id);
        }
        const key = normalizeHeader(student.name);
        studentIdsByName.set(key, [...(studentIdsByName.get(key) || []), student.id]);
      });

      // 已存在的反馈（学生 + 日期）用于跳过重复数据
      const existingKeys = new Set(
        feedbacks.map((feedback) => `${feedback.student_id}|${feedback.class_date.slice(0, 10)}`)
      );

      const payloads: ImportPayload[] = [];
      const skipped: string[] = [];

      rawRows.forEach((rawRow, index) => {
        const rowNumber = index + 2; // 表头占第 1 行
        const row = normalizeRecord(rawRow);

        const className = readImportText(readField(row, IMPORT_HEADER_ALIASES.className));
        const studentName = readImportText(readField(row, IMPORT_HEADER_ALIASES.studentName));
        const classDate = parseImportDate(readField(row, IMPORT_HEADER_ALIASES.classDate));
        const evaluation = readImportText(readField(row, IMPORT_HEADER_ALIASES.evaluation));

        if (!className && !studentName && !classDate && !evaluation) return;

        if (!className || !studentName || !classDate || !evaluation) {
          skipped.push(`第 ${rowNumber} 行：缺少班级名称 / 学生姓名 / 上课日期 / 评价`);
          return;
        }

        const classId = classIdByName.get(normalizeHeader(className));
        if (!classId) {
          skipped.push(`第 ${rowNumber} 行：班级「${className}」不存在`);
          return;
        }

        let studentId = studentIdByClassAndName.get(`${classId}|${normalizeHeader(studentName)}`);
        if (!studentId) {
          const candidates = studentIdsByName.get(normalizeHeader(studentName)) || [];
          if (candidates.length === 1) {
            studentId = candidates[0];
          } else if (candidates.length > 1) {
            skipped.push(`第 ${rowNumber} 行：学生「${studentName}」在多个班级中重名，无法确定`);
            return;
          } else {
            skipped.push(`第 ${rowNumber} 行：学生「${studentName}」不存在`);
            return;
          }
        }

        const duplicateKey = `${studentId}|${classDate}`;
        if (existingKeys.has(duplicateKey)) {
          skipped.push(`第 ${rowNumber} 行：${studentName} ${classDate} 的反馈已存在，跳过`);
          return;
        }
        existingKeys.add(duplicateKey);

        payloads.push({
          class_id: classId,
          student_id: studentId,
          class_date: classDate,
          teaching_content: readImportText(readField(row, IMPORT_HEADER_ALIASES.teachingContent)),
          homework_content: readImportText(readField(row, IMPORT_HEADER_ALIASES.homeworkContent)),
          homework_score: parseImportScore(readField(row, IMPORT_HEADER_ALIASES.homeworkScore)),
          exercise_score: parseImportScore(readField(row, IMPORT_HEADER_ALIASES.exerciseScore)),
          thinking_score: parseImportScore(readField(row, IMPORT_HEADER_ALIASES.thinkingScore)),
          performance_score: parseImportScore(readField(row, IMPORT_HEADER_ALIASES.performanceScore)),
          overall_score: parseImportScore(readField(row, IMPORT_HEADER_ALIASES.overallScore)),
          evaluation,
          label: `${studentName}（${classDate}）`,
        });
      });

      if (payloads.length === 0) {
        alert(`没有可导入的数据。\n\n${skipped.slice(0, 10).join('\n')}`);
        return;
      }

      const skippedPreview = skipped.slice(0, 5).join('\n');
      const confirmMessage = [
        `共读取 ${rawRows.length} 行：可导入 ${payloads.length} 条${skipped.length > 0 ? `，跳过 ${skipped.length} 条` : ''}。`,
        skipped.length > 0 ? `\n跳过原因：\n${skippedPreview}${skipped.length > 5 ? '\n…' : ''}` : '',
        '\n是否继续导入？',
      ].join('');
      if (!confirm(confirmMessage)) return;

      let successCount = 0;
      const failures: string[] = [];

      // 分批提交，避免一次性并发过多请求
      for (let start = 0; start < payloads.length; start += 10) {
        const batch = payloads.slice(start, start + 10);
        const results = await Promise.all(
          batch.map(({ label, ...payload }) =>
            fetch('/api/feedbacks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }).then(async (response) => ({
              ok: response.ok,
              label,
              error: response.ok ? '' : (await response.json().catch(() => null))?.error || '请求失败',
            }))
          )
        );

        results.forEach((result) => {
          if (result.ok) {
            successCount += 1;
          } else {
            failures.push(`${result.label}：${result.error}`);
          }
        });
      }

      if (failures.length > 0) {
        alert(
          `导入完成：成功 ${successCount} 条，失败 ${failures.length} 条。\n\n${failures.slice(0, 5).join('\n')}`
        );
      } else {
        alert(`导入成功，共 ${successCount} 条${skipped.length > 0 ? `，跳过 ${skipped.length} 条` : ''}`);
      }

      fetchFeedbacks();
    } catch (error) {
      console.error('导入 Excel 失败:', error);
      alert('导入失败，请确认文件为有效的 xlsx 格式');
    } finally {
      setImporting(false);
    }
  };

  const handleView = (feedback: Feedback) => {
    setViewFeedback(feedback);
    setShowViewModal(true);
  };

  const handlePrevFeedback = () => {
    const currentIndex = filteredFeedbacks.findIndex(f => f.id === viewFeedback?.id);
    if (currentIndex > 0) {
      setViewFeedback(filteredFeedbacks[currentIndex - 1]);
    }
  };

  const handleNextFeedback = () => {
    const currentIndex = filteredFeedbacks.findIndex(f => f.id === viewFeedback?.id);
    if (currentIndex < filteredFeedbacks.length - 1) {
      setViewFeedback(filteredFeedbacks[currentIndex + 1]);
    }
  };

  const currentFeedbackIndex = viewFeedback ? filteredFeedbacks.findIndex(f => f.id === viewFeedback.id) : -1;
  const hasPrevFeedback = currentFeedbackIndex > 0;
  const hasNextFeedback = currentFeedbackIndex < filteredFeedbacks.length - 1 && currentFeedbackIndex >= 0;

  const handleEdit = (feedback: Feedback) => {
    // 设置编辑模式，加载反馈数据
    setEditingFeedback(feedback);

    // 设置表单数据
    const evaluationData = {
      homework_score: feedback.homework_score || 5,
      exercise_score: feedback.exercise_score || 5,
      thinking_score: feedback.thinking_score || 5,
      performance_score: feedback.performance_score || 5,
      overall_score: feedback.overall_score || 5,
      evaluation: feedback.evaluation,
    };

    // 获取该班级的所有学生
    const students = allStudents.filter(s => s.class_id === feedback.class_id);
    setClassStudents(students);

    setFormData({
      class_id: feedback.class_id.toString(),
      class_date: feedback.class_date.split('T')[0],
      teaching_content: feedback.teaching_content || '',
      homework_content: feedback.homework_content || '',
      evaluations: {
        [feedback.student_id]: evaluationData,
      },
    });

    setShowModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewFeedback(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFeedback(null);
    setClassStudents([]);
    setFormData({
      class_id: '',
      class_date: new Date().toISOString().split('T')[0],
      teaching_content: '',
      homework_content: '',
      evaluations: {},
    });
  };

  if (loading) {
    return <div className="text-center py-10">加载中...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">课后反馈</h2>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          {selectedFeedbackIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors w-full sm:w-auto justify-center"
            >
              <Trash2 className="w-5 h-5" />
              批量删除 ({selectedFeedbackIds.length})
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors w-full sm:w-auto justify-center ${
              showFilters || hasActiveFilters
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-5 h-5" />
            筛选 {hasActiveFilters && `(${filteredFeedbacks.length})`}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            新增反馈
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors w-full sm:w-auto justify-center"
            title="导出为 Excel"
          >
            <FileSpreadsheet className="w-5 h-5" />
            导出
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
            title="从 Excel 导入历史评价"
          >
            <Upload className="w-5 h-5" />
            {importing ? '导入中...' : '导入'}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportExcel}
          />
        </div>
      </div>

      {/* 筛选区域 */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                开始日期
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                结束日期
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                学生姓名
              </label>
              <input
                type="text"
                value={filters.studentName}
                onChange={(e) => setFilters({ ...filters, studentName: e.target.value })}
                placeholder="输入学生姓名"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                班级
              </label>
              <select
                value={filters.classId}
                onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">全部班级</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4" />
                清除筛选
              </button>
            </div>
          )}
        </div>
      )}

      {/* 反馈列表 - 响应式 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* 桌面端表格 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedFeedbackIds.length === filteredFeedbacks.length && filteredFeedbacks.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  上课日期
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  班级
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  学生
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  评价
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFeedbacks.map((feedback) => (
                <tr key={feedback.id} className="hover:bg-gray-50">
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedFeedbackIds.includes(feedback.id)}
                      onChange={(e) => handleSelectFeedback(feedback.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(feedback.class_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {feedback.classes?.name || '-'}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {feedback.students?.name || '-'}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs lg:max-w-sm truncate">
                      {feedback.evaluation}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(feedback)}
                      className="text-green-600 hover:text-green-900 mr-2 sm:mr-4"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleView(feedback)}
                      className="text-blue-600 hover:text-blue-900 mr-2 sm:mr-4"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4 inline" />
                  </button>
                  <button
                    onClick={() => handleDelete(feedback.id)}
                    className="text-red-600 hover:text-red-900"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredFeedbacks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 lg:px-6 py-10 text-center text-gray-500">
                  暂无反馈数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* 移动端卡片列表 */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredFeedbacks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {hasActiveFilters ? '没有符合筛选条件的数据' : '暂无反馈数据'}
            </div>
          ) : (
            filteredFeedbacks.map((feedback) => (
              <div key={feedback.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 truncate">
                      {feedback.students?.name || '未知学生'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {feedback.classes?.name || '未知班级'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(feedback.class_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => handleEdit(feedback)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      title="编辑"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleView(feedback)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="查看详情"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(feedback.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="删除"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {feedback.evaluation}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={selectedFeedbackIds.includes(feedback.id)}
                    onChange={(e) => handleSelectFeedback(feedback.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-500">选择</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 新增反馈弹窗 - 响应式 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-3xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingFeedback ? '编辑课后反馈' : '新增课后反馈'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      上课日期 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.class_date}
                      onChange={(e) => setFormData({ ...formData, class_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      上课班级 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.class_id}
                      onChange={(e) => handleClassChange(e.target.value)}
                      disabled={!!editingFeedback}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">请选择班级</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 教学内容 */}
              {formData.class_id && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    教学内容
                  </h4>
                  <textarea
                    value={formData.teaching_content}
                    onChange={(e) => setFormData({ ...formData, teaching_content: e.target.value })}
                    placeholder="请输入本次课程的教学内容..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              )}

              {/* 课后作业 */}
              {formData.class_id && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    课后作业
                  </h4>
                  <textarea
                    value={formData.homework_content}
                    onChange={(e) => setFormData({ ...formData, homework_content: e.target.value })}
                    placeholder="请输入本次课程的课后作业内容..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              )}

              {/* 学生评价列表 */}
              {classStudents.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    学生评价 {editingFeedback ? '' : `(${classStudents.length} 位学生)`}
                  </h4>
                  <div ref={feedbackContentRef} data-feedback-content className="space-y-4">
                    {classStudents
                      .filter(student => !editingFeedback || student.id === editingFeedback.student_id)
                      .map((student) => {
                      const evaluationData = formData.evaluations[student.id];
                      return (
                        <div key={student.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium text-gray-900 text-base">
                              {student.name} ({student.gender})
                            </span>
                          </div>

                          {/* 评分部分 */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-3">
                            {[
                              { key: 'homework_score', label: '作业情况' },
                              { key: 'exercise_score', label: '课堂练习' },
                              { key: 'thinking_score', label: '编程思维' },
                              { key: 'performance_score', label: '课堂表现' },
                              { key: 'overall_score', label: '综合评分' },
                            ].map((item) => {
                              const score = Number(evaluationData?.[item.key as keyof StudentEvaluation]) || 5;
                              return (
                                <div key={item.key} className="min-w-0">
                                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 truncate">
                                    {item.label}
                                  </label>
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => {
                                          setFormData({
                                            ...formData,
                                            evaluations: {
                                              ...formData.evaluations,
                                              [student.id]: {
                                                ...evaluationData,
                                                [item.key]: star,
                                              },
                                            },
                                          });
                                        }}
                                        className="focus:outline-none p-0.5 hover:bg-gray-100 rounded transition-colors"
                                      >
                                        <Star
                                          className={`w-3 h-3 sm:w-4 sm:h-4 transition-colors ${
                                            star <= score
                                              ? 'fill-yellow-400 text-yellow-400'
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      </button>
                                    ))}
                                    
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* 评价/建议 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              评价/建议
                            </label>
                            <textarea
                              value={evaluationData?.evaluation || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                evaluations: {
                                  ...formData.evaluations,
                                  [student.id]: {
                                    ...evaluationData,
                                    evaluation: e.target.value,
                                  },
                                },
                              })}
                              placeholder="请输入该学生的评价/建议..."
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {formData.class_id && classStudents.length === 0 && (
                <div className="mb-6 text-center py-8 text-gray-500 border rounded-lg">
                  该班级暂无学生
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!formData.class_id || classStudents.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {editingFeedback ? '保存修改' : '提交反馈'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 查看反馈详情弹窗 - 响应式 */}
      {showViewModal && viewFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">反馈详情</h3>
                <span className="text-xs text-gray-400">
                  {currentFeedbackIndex + 1} / {filteredFeedbacks.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => filteredFeedbacks.length > 0 && setViewFeedback(filteredFeedbacks[0])}
                    disabled={!hasPrevFeedback}
                    className="p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="第一条"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-gray-200" />
                  <button
                    onClick={handlePrevFeedback}
                    disabled={!hasPrevFeedback}
                    className="p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="上一条"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-gray-200" />
                  <button
                    onClick={handleNextFeedback}
                    disabled={!hasNextFeedback}
                    className="p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="下一条"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-gray-200" />
                  <button
                    onClick={() => filteredFeedbacks.length > 0 && setViewFeedback(filteredFeedbacks[filteredFeedbacks.length - 1])}
                    disabled={!hasNextFeedback}
                    className="p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="最后一条"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleDownloadImage}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="生成图片"
                >
                  <Download className="w-4 h-4" />
                  生成图片
                </button>
                <button onClick={handleCloseViewModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div ref={feedbackContentRef} data-feedback-content className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  上课日期
                </label>
                <div className="text-sm text-gray-900">
                  {new Date(viewFeedback.class_date).toLocaleDateString()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  班级
                </label>
                <div className="text-sm text-gray-900">
                  {viewFeedback.classes?.name || '-'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  学生
                </label>
                <div className="text-sm text-gray-900">
                  {viewFeedback.students?.name || '-'}
                </div>
              </div>

              {viewFeedback.teaching_content && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    教学内容
                  </label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap break-words">
                    {viewFeedback.teaching_content}
                  </div>
                </div>
              )}

              {viewFeedback.homework_content && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    课后作业
                  </label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap break-words">
                    {viewFeedback.homework_content}
                  </div>
                </div>
              )}

              {/* 评分雷达图 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  评分雷达图（1-5分）
                </label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={[
                      {
                        dimension: '作业情况',
                        value: viewFeedback.homework_score || 0
                      },
                      {
                        dimension: '课堂练习',
                        value: viewFeedback.exercise_score || 0
                      },
                      {
                        dimension: '编程思维',
                        value: viewFeedback.thinking_score || 0
                      },
                      {
                        dimension: '课堂表现',
                        value: viewFeedback.performance_score || 0
                      },
                      {
                        dimension: '综合评分',
                        value: viewFeedback.overall_score || 0
                      }
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 5]}
                        tick={{ fontSize: 11 }}
                        tickCount={6}
                      />
                      <Radar
                        name="评分"
                        dataKey="value"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  评价/建议
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap break-words">
                  {viewFeedback.evaluation}
                </div>
              </div>

              {/* 创建时间 - 图片导出时隐藏
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  创建时间
                </label>
                <div className="text-sm text-gray-500">
                  {new Date(viewFeedback.created_at).toLocaleString()}
                </div>
              </div> */}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleDownloadImage}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                生成图片
              </button>
              <button
                onClick={handleCloseViewModal}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
