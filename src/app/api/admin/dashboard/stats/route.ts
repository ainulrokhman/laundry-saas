/**
 * Admin Dashboard Statistics API (SUPERADMIN)
 * 
 * GET /api/admin/dashboard/stats
 * Returns comprehensive dashboard statistics for admin overview
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { AdminDashboardService } from '@/services/admin/AdminDashboardService';

const dashboardService = new AdminDashboardService();

export const GET = withAdminAuth(async (request: Request, session: ExtendedSession) => {
  try {
    const stats = await dashboardService.getStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Gagal memuat statistik dashboard' 
      },
      { status: 500 }
    );
  }
});
