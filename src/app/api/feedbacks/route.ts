import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

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

// GET - 获取反馈列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const studentId = searchParams.get('student_id');
    
    const client = getSupabaseClient();
    
    let query = client
      .from('feedbacks')
      .select(`
        *,
        classes (
          id,
          name
        ),
        students (
          id,
          name
        )
      `)
      // 软删除：已移入回收站的记录不出现在列表里
      .is('deleted_at', null)
      // 排序规则：上课日期倒序；同一天内按班级编号倒序，再按学生编号倒序
      .order('class_date', { ascending: false })
      .order('class_id', { ascending: false })
      .order('student_id', { ascending: false });
    
    if (classId) {
      query = query.eq('class_id', parseInt(classId));
    }
    
    if (studentId) {
      query = query.eq('student_id', parseInt(studentId));
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(`查询反馈失败: ${error.message}`);
    
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}

// POST - 创建反馈
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      class_id,
      student_id,
      class_date,
      teaching_content,
      homework_content,
      homework_score,
      exercise_score,
      thinking_score,
      performance_score,
      overall_score,
      evaluation
    } = body;

    if (!class_id || !student_id || !class_date || !evaluation) {
      return NextResponse.json(
        { error: '班级、学生、上课日期和评价不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('feedbacks')
      .insert({
        class_id,
        student_id,
        class_date,
        teaching_content: teaching_content || null,
        homework_content: homework_content || null,
        homework_score: homework_score || null,
        exercise_score: exercise_score || null,
        thinking_score: thinking_score || null,
        performance_score: performance_score || null,
        overall_score: overall_score || null,
        evaluation
      })
      .select()
      .single();
    
    if (error) throw new Error(`创建反馈失败: ${error.message}`);
    
    return NextResponse.json({ data: data as Feedback });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新反馈
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      class_id,
      student_id,
      class_date,
      teaching_content,
      homework_content,
      homework_score,
      exercise_score,
      thinking_score,
      performance_score,
      overall_score,
      evaluation
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: '反馈ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('feedbacks')
      .update({
        class_id,
        student_id,
        class_date,
        teaching_content: teaching_content || null,
        homework_content: homework_content || null,
        homework_score: homework_score || null,
        exercise_score: exercise_score || null,
        thinking_score: thinking_score || null,
        performance_score: performance_score || null,
        overall_score: overall_score || null,
        evaluation,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`更新反馈失败: ${error.message}`);
    
    return NextResponse.json({ data: data as Feedback });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除反馈
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '反馈ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('feedbacks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', parseInt(id));
    
    if (error) throw new Error(`删除反馈失败: ${error.message}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
