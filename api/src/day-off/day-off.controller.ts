import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  Header,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import type { Response } from 'express';
import { Types } from 'mongoose';
import { DayOffService } from './day-off.service';
import { CompaniesService } from '../companies/companies.service';
import { Public } from '../auth/decorators/public.decorator';
import { RequireAccess } from '../access/decorators/require-access.decorator';
import { CurrentCompany, TenantScoped, NoTenant } from '../common/tenant.decorators';

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Controller('companies/:companySlug/day-off')
@TenantScoped()
export class DayOffController {
  constructor(
    private readonly dayOffService: DayOffService,
    @Optional() private readonly companiesService?: CompaniesService,
  ) {}

  // --- Settings ---
  @Get('settings')
  @RequireAccess({ module: 'dayoff.policies', action: 'read' })
  getSettings(@CurrentCompany() companyId: Types.ObjectId) {
    return this.dayOffService.getSettings(companyId);
  }

  @Patch('settings')
  @RequireAccess({ module: 'dayoff.policies', action: 'update' })
  async updateSettings(
    @CurrentCompany() companyId: Types.ObjectId,
    @Req() req: any,
    @Body() body: any,
  ) {
    // TODO(PBAC): Replace with granular PBAC permissions once PBAC plan is implemented
    if (!req.membership?.isCompanyOwner && !req.user?.is_system_admin) {
      throw new ForbiddenException('Only the company owner or admin can modify settings');
    }
    return this.dayOffService.updateSettings(companyId, body);
  }

  // --- Leave Types ---
  @Get('leave-types')
  @RequireAccess({ module: 'dayoff.policies', action: 'read' })
  getLeaveTypes(
    @CurrentCompany() companyId: Types.ObjectId,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.dayOffService.getLeaveTypes(companyId, { activeOnly: activeOnly === 'true' });
  }

  @Get('leave-types/:id')
  @RequireAccess({ module: 'dayoff.policies', action: 'read' })
  getLeaveTypeById(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
  ) {
    return this.dayOffService.getLeaveTypeById(companyId, id);
  }

  @Post('leave-types')
  @RequireAccess({ module: 'dayoff.policies', action: 'create' })
  async createLeaveType(
    @CurrentCompany() companyId: Types.ObjectId,
    @Req() req: any,
    @Body() body: any,
  ) {
    // TODO(PBAC): Replace with granular PBAC permissions once PBAC plan is implemented
    if (!req.membership?.isCompanyOwner && !req.user?.is_system_admin) {
      throw new ForbiddenException('Only the company owner or admin can create leave types');
    }
    return this.dayOffService.createLeaveType(companyId, body);
  }

  @Patch('leave-types/:id')
  @RequireAccess({ module: 'dayoff.policies', action: 'update' })
  async updateLeaveType(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    // TODO(PBAC): Replace with granular PBAC permissions once PBAC plan is implemented
    if (!req.membership?.isCompanyOwner && !req.user?.is_system_admin) {
      throw new ForbiddenException('Only the company owner or admin can update leave types');
    }
    return this.dayOffService.updateLeaveType(companyId, id, body);
  }

  @Delete('leave-types/:id')
  @RequireAccess({ module: 'dayoff.policies', action: 'delete' })
  async deleteLeaveType(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    // TODO(PBAC): Replace with granular PBAC permissions once PBAC plan is implemented
    if (!req.membership?.isCompanyOwner && !req.user?.is_system_admin) {
      throw new ForbiddenException('Only the company owner or admin can delete leave types');
    }
    return this.dayOffService.deleteLeaveType(companyId, id);
  }

  // --- Balances ---
  @Get('balances')
  @RequireAccess({ module: 'dayoff', action: 'read' })
  async getMyBalances(
    @CurrentCompany() companyId: Types.ObjectId,
    @Req() req: any,
    @Query('year') year?: string,
  ) {
    const employeeId = req.membership?.employeeId;
    if (!employeeId) {
      throw new BadRequestException('Your membership is not linked to an employee profile.');
    }
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.dayOffService.getEmployeeBalances(companyId, employeeId, y);
  }

  @Get('balances/:employeeId')
  @RequireAccess({ module: 'dayoff', action: 'read' })
  getEmployeeBalances(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
  ) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.dayOffService.getEmployeeBalances(companyId, employeeId, y);
  }

  // --- Applications ---
  @Post('applications')
  @RequireAccess({ module: 'dayoff', action: 'create' })
  applyLeave(
    @CurrentCompany() companyId: Types.ObjectId,
    @Req() req: any,
    @Body() body: any,
  ) {
    const employeeId = req.membership?.employeeId;
    if (!employeeId) {
      throw new BadRequestException('Your membership is not linked to an employee profile.');
    }
    return this.dayOffService.applyLeave(companyId, employeeId, req.user, body);
  }

  @Get('applications/my')
  @RequireAccess({ module: 'dayoff', action: 'read' })
  getMyApplications(
    @CurrentCompany() companyId: Types.ObjectId,
    @Req() req: any,
    @Query('year') year?: string,
  ) {
    const y = year ? parseInt(year, 10) : undefined;
    return this.dayOffService.getMyApplications(companyId, req.user, y);
  }

  @Get('applications')
  @RequireAccess({ module: 'dayoff.approvals', action: 'read' })
  async getAllApplications(
    @CurrentCompany() companyId: Types.ObjectId,
    @Req() req: any,
    @Query('status') status?: string,
    @Query('year') year?: string,
    @Query('scope') scope?: string,
  ) {
    const y = year ? parseInt(year, 10) : undefined;
    if (scope === 'my') {
      return this.dayOffService.getMyApplications(companyId, req.user, y);
    }
    const isSystemAdmin = req.user?.is_system_admin === true;
    const effectiveScope = req.access?.['dayoff.approvals']?.scope || req.accessDecision?.scope || 'team';
    return this.dayOffService.getAllApplications(companyId, { status, year: y }, req.user, effectiveScope, isSystemAdmin);
  }

  @Patch('applications/:id/cancel')
  @RequireAccess({ module: 'dayoff', action: 'cancel' })
  cancelApplication(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.dayOffService.cancelApplication(companyId, id, req.user);
  }

  @Patch('applications/:id/status')
  @RequireAccess({ module: 'dayoff.approvals', action: 'approve' })
  updateApplicationStatus(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected'; reason?: string },
    @Req() req: any,
  ) {
    const isSystemAdmin = req.user?.is_system_admin === true;
    const effectiveScope = req.access?.['dayoff.approvals']?.scope || req.accessDecision?.scope || 'team';
    return this.dayOffService.updateApplicationStatus(
      companyId,
      id,
      body.status,
      req.user,
      body.reason,
      effectiveScope,
      isSystemAdmin,
    );
  }

  /**
   * Public 1-click Approval endpoint triggered from Email action button
   */
  @Public()
  @NoTenant()
  @Get('applications/:id/approve')
  @Header('Content-Type', 'text/html')
  async approveByToken(
    @Param('companySlug') companySlug: string,
    @Param('id') id: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const appUrl = (process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

    try {
      if (!token) {
        return res.status(400).send(this.renderResultHtml({
          success: false,
          title: 'Missing Approval Token',
          message: 'The approval link is invalid or incomplete.',
          appUrl,
        }));
      }

      let companyId: Types.ObjectId | undefined;
      if (companySlug && this.companiesService) {
        const company = await this.companiesService.findBySlug(companySlug);
        if (!company) {
          return res.status(200).send(this.renderResultHtml({
            success: false,
            title: 'Company Not Found',
            message: 'The requested company was not found or is inactive.',
            appUrl,
          }));
        }
        companyId = company._id;
      }

      const result = await this.dayOffService.approveByToken(id, token, companyId || companySlug);

      return res.status(200).send(this.renderResultHtml({
        success: true,
        title: 'Leave Approved Successfully',
        message: result.message || 'The leave application has been marked as Approved, and the employee has been notified.',
        appUrl,
      }));
    } catch (err: any) {
      return res.status(200).send(this.renderResultHtml({
        success: false,
        title: 'Approval Could Not Be Completed',
        message: err.message || 'An error occurred while approving this request.',
        appUrl,
      }));
    }
  }

  private renderResultHtml(params: { success: boolean; title: string; message: string; appUrl: string }): string {
    const iconColor = params.success ? '#16a34a' : '#dc2626';
    const bgColor = params.success ? '#f0fdf4' : '#fef2f2';
    const borderColor = params.success ? '#bbf7d0' : '#fecaca';
    const icon = params.success
      ? `<svg width="48" height="48" fill="none" stroke="${iconColor}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
      : `<svg width="48" height="48" fill="none" stroke="${iconColor}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;

    const safeTitle = escapeHtml(params.title);
    const safeMessage = escapeHtml(params.message);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${safeTitle} - Task Manager</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .card {
            background: white;
            max-width: 480px;
            width: 100%;
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
            padding: 36px 32px;
            text-align: center;
            border: 1px solid #e2e8f0;
          }
          .icon-wrapper {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background-color: ${bgColor};
            border: 1px solid ${borderColor};
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
          }
          h1 {
            font-size: 22px;
            color: #0f172a;
            margin: 0 0 12px 0;
            font-weight: 700;
          }
          p {
            font-size: 15px;
            color: #64748b;
            line-height: 1.6;
            margin: 0 0 28px 0;
          }
          .btn {
            display: inline-block;
            background-color: #0f172a;
            color: white;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.15s ease;
          }
          .btn:hover {
            background-color: #1e293b;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-wrapper">
            ${icon}
          </div>
          <h1>${safeTitle}</h1>
          <p>${safeMessage}</p>
          <a href="${params.appUrl}/dayoff" class="btn">Open Task Manager</a>
        </div>
      </body>
      </html>
    `;
  }
}
