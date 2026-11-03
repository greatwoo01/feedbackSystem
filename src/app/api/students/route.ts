import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

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
}

// GET - 获取所有学生
export async function GET() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('students')
      .select(`
        *,
        classes (
          id,
          name
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`查询学生失败: ${error.message}`);
    
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}

// POST - 创建学生
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, gender, parent_phone, class_id, birthday, grade } = body;

    if (!name || !gender) {
      return NextResponse.json(
        { error: '学生姓名和性别不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('students')
      .insert({ 
        name, 
        gender, 
        parent_phone: parent_phone || null, 
        class_id: class_id || null, 
        birthday: birthday || null, 
        grade: grade || null 
      })
      .select()
      .single();
    
    if (error) throw new Error(`创建学生失败: ${error.message}`);
    
    return NextResponse.json({ data: data as Student });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新学生
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, gender, parent_phone, class_id, birthday, grade } = body;

    if (!id) {
      return NextResponse.json(
        { error: '学生ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('students')
      .update({ 
        name, 
        gender, 
        parent_phone: parent_phone || null, 
        class_id: class_id || null, 
        birthday: birthday || null, 
        grade: grade || null,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`更新学生失败: ${error.message}`);
    
    return NextResponse.json({ data: data as Student });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除学生
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '学生ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('students')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', parseInt(id));
    
    if (error) throw new Error(`删除学生失败: ${error.message}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
