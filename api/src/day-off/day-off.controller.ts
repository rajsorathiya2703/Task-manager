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
} from '@nestjs/common';
import type { Response } from 'express';
import { DayOffService } from './day-off.service';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { UserGroupsService } from '../user-groups/user-groups.service';

@Controller('day-off')
export class DayOffController {
  constructor(
    private readonly dayOffService: DayOffService,
    private readonly userGroupsService: UserGroupsService,
  ) {}

  // --- Settings ---
  @Get('settings')
  @RequirePermission({ module: 'dayoff', action: 'read', operation: 'dayoff.policies' })
  getSettings() {
    return this.dayOffService.getSettings();
  }

  @Patch('settings')
  @RequirePermission({ module: 'dayoff', action: 'update', operation: 'dayoff.policies' })
  updateSettings(@Body() body: any) {
    return this.dayOffService.updateSettings(body);
  }

  // --- Leave Types ---
  @Get('leave-types')
  @RequirePermission({ module: 'dayoff', action: 'read', operation: 'dayoff.requests' })
  getLeaveTypes(@Query('activeOnly') activeOnly?: string) {
    return this.dayOffService.getLeaveTypes({ activeOnly: activeOnly === 'true' });
  }

  @Get('leave-types/:id')
  @RequirePermission({ module: 'dayoff', action: 'read', operation: 'dayoff.policies' })
  getLeaveTypeById(@Param('id') id: string) {
    return this.dayOffService.getLeaveTypeById(id);
  }

  @Post('leave-types')
  @RequirePermission({ module: 'dayoff', action: 'create', operation: 'dayoff.policies' })
  createLeaveType(@Body() body: any) {
    return this.dayOffService.createLeaveType(body);
  }

  @Patch('leave-types/:id')
  @RequirePermission({ module: 'dayoff', action: 'update', operation: 'dayoff.policies' })
  updateLeaveType(@Param('id') id: string, @Body() body: any) {
    return this.dayOffService.updateLeaveType(id, body);
  }

  @Delete('leave-types/:id')
  @RequirePermission({ module: 'dayoff', action: 'delete', operation: 'dayoff.policies' })
  deleteLeaveType(@Param('id') id: string) {
    return this.dayOffService.deleteLeaveType(id);
  }

  // --- Balances ---
  @Get('balances')
  @RequirePermission({ module: 'dayoff', action: 'read', operation: 'dayoff.calendar' })
  async getMyBalances(@Req() req: any, @Query('year') year?: string) {
    const userId = req.user?.id || req.user?._id;
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const myLeaves = await this.dayOffService.getMyApplications(req.user, y);
    const employeeId = myLeaves[0]?.employeeId?._id || (myLeaves[0]?.employeeId as any);
    if (!employeeId) {
      return this.dayOffService.getEmployeeBalances(userId, y);
    }
    return this.dayOffService.getEmployeeBalances(employeeId.toString(), y);
  }

  @Get('balances/:employeeId')
  @RequirePermission({ module: 'dayoff', action: 'read', operation: 'dayoff.approvals' })
  getEmployeeBalances(@Param('employeeId') employeeId: string, @Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.dayOffService.getEmployeeBalances(employeeId, y);
  }

  // --- Applications ---
  @Post('applications')
  @RequirePermission({ module: 'dayoff', action: 'create', operation: 'dayoff.requests' })
  applyLeave(@Req() req: any, @Body() body: any) {
    return this.dayOffService.applyLeave(req.user, body);
  }

  @Get('applications/my')
  @RequirePermission({ module: 'dayoff', action: 'read', operation: 'dayoff.requests' })
  getMyApplications(@Req() req: any, @Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : undefined;
    return this.dayOffService.getMyApplications(req.user, y);
  }

  @Get('applications')
  @RequirePermission({ module: 'dayoff', action: 'read', operation: 'dayoff.requests' })
  async getAllApplications(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('year') year?: string,
    @Query('scope') scope?: string,
  ) {
    const y = year ? parseInt(year, 10) : undefined;
    if (scope === 'my') {
      return this.dayOffService.getMyApplications(req.user, y);
    }

    // Viewing all employee applications requires dayoff.approvals or Administrators
    const userId = req.user?.id || req.user?._id;
    if (userId) {
      const userPerms = await this.userGroupsService.getUserPermissions(userId.toString());
      const isAdministrator = userPerms.groups?.some(
        (g) => g.trim().toLowerCase() === 'administrators',
      );
      if (!isAdministrator) {
        const opPerm = (userPerms as any).operationPermissions?.['dayoff.approvals'];
        if (!opPerm || opPerm.read === false) {
          throw new ForbiddenException(
            'Access Denied: You do not have permission to view all leave applications.',
          );
        }
      }
    }

    return this.dayOffService.getAllApplications({ status, year: y });
  }

  @Patch('applications/:id/cancel')
  @RequirePermission({ module: 'dayoff', action: 'update', operation: 'dayoff.requests' })
  cancelApplication(@Param('id') id: string, @Req() req: any) {
    return this.dayOffService.cancelApplication(id, req.user);
  }

  @Patch('applications/:id/status')
  @RequirePermission({ module: 'dayoff', action: 'update', operation: 'dayoff.approvals' })
  updateApplicationStatus(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected'; reason?: string },
    @Req() req: any,
  ) {
    return this.dayOffService.updateApplicationStatus(id, body.status, req.user, body.reason);
  }

  /**
   * Public 1-click Approval endpoint triggered from Email action button
   */
  @Public()
  @Get('applications/:id/approve')
  @Header('Content-Type', 'text/html')
  async approveByToken(
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

      const result = await this.dayOffService.approveByToken(id, token);

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

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${params.title} - Task Manager</title>
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
          <h1>${params.title}</h1>
          <p>${params.message}</p>
          <a href="${params.appUrl}/dayoff" class="btn">Open Task Manager</a>
        </div>
      </body>
      </html>
    `;
  }
}
