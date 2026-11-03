import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface Teacher {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at?: string;
}

// GET - 获取所有教师
export async function GET() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('teachers')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`查询教师失败: ${error.message}`);
    
    return NextResponse.json({ data: data as Teacher[] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}

// POST - 创建教师
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email } = body;

    if (!name) {
      return NextResponse.json(
        { error: '教师姓名不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('teachers')
      .insert({ name, phone, email })
      .select()
      .single();
    
    if (error) throw new Error(`创建教师失败: ${error.message}`);
    
    return NextResponse.json({ data: data as Teacher });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新教师
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone, email } = body;

    if (!id) {
      return NextResponse.json(
        { error: '教师ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('teachers')
      .update({ name, phone, email, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`更新教师失败: ${error.message}`);
    
    return NextResponse.json({ data: data as Teacher });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除教师
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '教师ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('teachers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', parseInt(id));
    
    if (error) throw new Error(`删除教师失败: ${error.message}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
