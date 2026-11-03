import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

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

// GET - 获取所有班级
export async function GET() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('classes')
      .select(`
        *,
        teachers (
          id,
          name
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`查询班级失败: ${error.message}`);
    
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}

// POST - 创建班级
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, teacher_id } = body;

    if (!name) {
      return NextResponse.json(
        { error: '班级名称不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('classes')
      .insert({ name, teacher_id })
      .select()
      .single();
    
    if (error) throw new Error(`创建班级失败: ${error.message}`);
    
    return NextResponse.json({ data: data as Class });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新班级
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, teacher_id } = body;

    if (!id) {
      return NextResponse.json(
        { error: '班级ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('classes')
      .update({ name, teacher_id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`更新班级失败: ${error.message}`);
    
    return NextResponse.json({ data: data as Class });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除班级
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '班级ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('classes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', parseInt(id));
    
    if (error) throw new Error(`删除班级失败: ${error.message}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
