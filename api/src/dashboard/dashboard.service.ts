import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task } from '../tasks/schemas/task.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { EmployeeActivityQueryDto } from './dto/employee-activity-query.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
  ) {}

  private getDateRange(query: EmployeeActivityQueryDto): {
    currentStart: Date;
    currentEnd: Date;
    prevStart: Date;
    prevEnd: Date;
  } {
    const now = new Date();

    if (query.startDate && query.endDate) {
      const currentStart = new Date(query.startDate);
      const currentEnd = new Date(query.endDate);
      const diffMs = Math.max(1000, currentEnd.getTime() - currentStart.getTime());
      const prevEnd = new Date(currentStart.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - diffMs);
      return { currentStart, currentEnd, prevStart, prevEnd };
    }

    if (query.range === 'monthly') {
      const currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { currentStart, currentEnd, prevStart, prevEnd };
    }

    // Default: weekly (Monday to Sunday)
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() + diffToMonday);
    currentStart.setHours(0, 0, 0, 0);

    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentStart.getDate() + 6);
    currentEnd.setHours(23, 59, 59, 999);

    const prevStart = new Date(currentStart);
    prevStart.setDate(currentStart.getDate() - 7);

    const prevEnd = new Date(currentEnd);
    prevEnd.setDate(currentEnd.getDate() - 7);

    return { currentStart, currentEnd, prevStart, prevEnd };
  }

  private calcDeltaPct(current: number, prev: number): number {
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100 * 10) / 10;
  }

  private getLevel(hours: number): 0 | 1 | 2 | 3 | 4 {
    if (hours <= 0) return 0;
    if (hours <= 2) return 1;
    if (hours <= 4) return 2;
    if (hours <= 7) return 3;
    return 4;
  }

  async getEmployeeActivity(query: EmployeeActivityQueryDto, userId?: string, email?: string) {
    const { currentStart, currentEnd, prevStart, prevEnd } = this.getDateRange(query);
    const now = new Date();

    // 1. Fetch employee list for selector
    const allEmployees = await this.employeeModel
      .find({}, { fullName: 1, email: 1, role: 1, department: 1, status: 1, joiningDate: 1 })
      .sort({ 'fullName.firstName': 1 })
      .exec();

    // 2. Resolve selected employee
    let selectedEmployee: any = null;
    if (query.employeeId && Types.ObjectId.isValid(query.employeeId)) {
      selectedEmployee = await this.employeeModel.findById(query.employeeId).exec();
    }
    if (!selectedEmployee && userId) {
      if (Types.ObjectId.isValid(userId)) {
        selectedEmployee = await this.employeeModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
      }
    }
    if (!selectedEmployee && email) {
      selectedEmployee = await this.employeeModel
        .findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } })
        .exec();
    }
    if (!selectedEmployee && allEmployees.length > 0) {
      selectedEmployee = allEmployees[0];
    }

    // 3. Facet Aggregation on Task model for overall workspace metrics
    const [facetResults] = await this.taskModel.aggregate([
      {
        $facet: {
          tasksCompleted: [
            {
              $match: {
                completedAt: { $gte: currentStart, $lte: currentEnd },
              },
            },
            { $count: 'count' },
          ],
          tasksCompletedPrev: [
            {
              $match: {
                completedAt: { $gte: prevStart, $lte: prevEnd },
              },
            },
            { $count: 'count' },
          ],
          openTasks: [
            {
              $match: {
                status: { $ne: 'Done' },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                overdue: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$dueDate', null] },
                          { $ne: ['$dueDate', ''] },
                          {
                            $lt: [
                              {
                                $dateFromString: {
                                  dateString: '$dueDate',
                                  onError: new Date(8640000000000000),
                                  onNull: new Date(8640000000000000),
                                },
                              },
                              now,
                            ],
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          hoursLogged: [
            { $unwind: '$timeEntries' },
            {
              $match: {
                'timeEntries.startTime': { $gte: currentStart, $lte: currentEnd },
              },
            },
            {
              $group: {
                _id: null,
                totalSeconds: { $sum: '$timeEntries.durationSeconds' },
              },
            },
          ],
          hoursLoggedPrev: [
            { $unwind: '$timeEntries' },
            {
              $match: {
                'timeEntries.startTime': { $gte: prevStart, $lte: prevEnd },
              },
            },
            {
              $group: {
                _id: null,
                totalSeconds: { $sum: '$timeEntries.durationSeconds' },
              },
            },
          ],
          completionTrend: [
            {
              $match: {
                completedAt: { $gte: currentStart, $lte: currentEnd },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$completedAt' },
                },
                completed: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            {
              $project: {
                _id: 0,
                date: '$_id',
                completed: 1,
              },
            },
          ],
          departmentPerformance: [
            {
              $match: {
                completedAt: { $gte: currentStart, $lte: currentEnd },
                assignee: { $exists: true, $ne: null },
              },
            },
            {
              $lookup: {
                from: 'employees',
                localField: 'assignee',
                foreignField: '_id',
                as: 'employee',
              },
            },
            { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: { $ifNull: ['$employee.department', 'General'] },
                tasksCompleted: { $sum: 1 },
              },
            },
            { $sort: { tasksCompleted: -1 } },
            {
              $project: {
                _id: 0,
                department: '$_id',
                tasksCompleted: 1,
              },
            },
          ],
          statusDistribution: [
            {
              $group: {
                _id: { $ifNull: ['$status', 'To Do'] },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],
          topPerformersCompleted: [
            {
              $match: {
                completedAt: { $gte: currentStart, $lte: currentEnd },
                assignee: { $exists: true, $ne: null },
              },
            },
            {
              $group: {
                _id: '$assignee',
                tasksCompleted: { $sum: 1 },
              },
            },
          ],
          topPerformersHours: [
            { $unwind: '$timeEntries' },
            {
              $match: {
                'timeEntries.startTime': { $gte: currentStart, $lte: currentEnd },
              },
            },
            {
              $project: {
                assigneeId: {
                  $ifNull: ['$timeEntries.assigneeId', '$assignee'],
                },
                durationSeconds: '$timeEntries.durationSeconds',
              },
            },
            {
              $match: {
                assigneeId: { $exists: true, $ne: null },
              },
            },
            {
              $group: {
                _id: '$assigneeId',
                totalSeconds: { $sum: '$durationSeconds' },
              },
            },
          ],
          recentActivity: [
            { $unwind: '$updates' },
            { $sort: { 'updates.timestamp': -1 } },
            { $limit: 20 },
            {
              $project: {
                _id: 0,
                taskId: { $toString: '$_id' },
                taskTitle: '$title',
                user: {
                  name: { $ifNull: ['$updates.user.name', 'User'] },
                  avatarUrl: '$updates.user.avatarUrl',
                },
                type: '$updates.type',
                message: '$updates.message',
                timestamp: '$updates.timestamp',
              },
            },
          ],
          liveNow: [
            {
              $match: {
                isTimerRunning: true,
              },
            },
            {
              $lookup: {
                from: 'employees',
                localField: 'assignee',
                foreignField: '_id',
                as: 'employee',
              },
            },
            { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                employeeId: {
                  $ifNull: [
                    { $toString: '$employee._id' },
                    { $toString: '$assignee' },
                  ],
                },
                name: {
                  $ifNull: [
                    {
                      $trim: {
                        input: {
                          $concat: [
                            { $ifNull: ['$employee.fullName.firstName', ''] },
                            ' ',
                            { $ifNull: ['$employee.fullName.lastName', ''] },
                          ],
                        },
                      },
                    },
                    { $ifNull: ['$timerUser.name', 'Team Member'] },
                  ],
                },
                avatarUrl: { $ifNull: ['$timerUser.avatarUrl', ''] },
                taskTitle: '$title',
                startedAt: '$timerStartedAt',
              },
            },
          ],
        },
      },
    ]);

    // 4. Active employees query (kept for internal use, removed from KPI cards)
    const activeEmployeesCount = await this.employeeModel.countDocuments({ status: 'Active' }).exec();

    // 5. Per-employee KPIs: tasks completed & open tasks for the selected (current-user) employee
    let userTasksCompleted = 0;
    let userOpenTasks = 0;
    let userOpenTasksOverdue = 0;

    if (selectedEmployee) {
      const empId = selectedEmployee._id;

      // Tasks completed by this employee in the selected date range
      const [completedResult] = await this.taskModel.aggregate([
        {
          $match: {
            assignee: empId,
            completedAt: { $gte: currentStart, $lte: currentEnd },
          },
        },
        { $count: 'count' },
      ]);
      userTasksCompleted = completedResult?.count || 0;

      // Open tasks assigned to this employee (status != Done)
      const openResult = await this.taskModel.aggregate([
        {
          $match: {
            assignee: empId,
            status: { $ne: 'Done' },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            overdue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$dueDate', null] },
                      { $ne: ['$dueDate', ''] },
                      {
                        $lt: [
                          {
                            $dateFromString: {
                              dateString: '$dueDate',
                              onError: new Date(8640000000000000),
                              onNull: new Date(8640000000000000),
                            },
                          },
                          now,
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);
      userOpenTasks = openResult?.[0]?.total || 0;
      userOpenTasksOverdue = openResult?.[0]?.overdue || 0;
    }

    // 6a. Per-employee completion trend (daily completed tasks in selected range)
    let userCompletionTrend: Array<{ date: string; completed: number }> = [];
    let userStatusDistribution: Array<{ status: string; count: number; pct: number }> = [];

    if (selectedEmployee) {
      const empId = selectedEmployee._id;

      // Completion trend: tasks completed by this employee, grouped by day
      const trendResult = await this.taskModel.aggregate([
        {
          $match: {
            assignee: empId,
            completedAt: { $gte: currentStart, $lte: currentEnd },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
            completed: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', completed: 1 } },
      ]);
      userCompletionTrend = trendResult;

      // Status distribution: all tasks assigned to this employee, grouped by status
      const statusResult = await this.taskModel.aggregate([
        { $match: { assignee: empId } },
        {
          $group: {
            _id: { $ifNull: ['$status', 'To Do'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);
      const statusTotal = statusResult.reduce((s: number, r: any) => s + r.count, 0);
      userStatusDistribution = statusResult.map((r: any) => ({
        status: r._id,
        count: r.count,
        pct: statusTotal > 0 ? Math.round((r.count / statusTotal) * 1000) / 10 : 0,
      }));
    }
    // 6. Status distribution
    const statusCounts: { _id: string; count: number }[] = facetResults?.statusDistribution || [];
    const totalStatusCount = statusCounts.reduce((sum, s) => sum + s.count, 0);
    const statusDistribution = statusCounts.map((s) => ({
      status: s._id,
      count: s.count,
      pct: totalStatusCount > 0 ? Math.round((s.count / totalStatusCount) * 1000) / 10 : 0,
    }));

    // 7. Top performers
    const completedByAssignee = new Map<string, number>();
    for (const item of facetResults?.topPerformersCompleted || []) {
      if (item._id) completedByAssignee.set(item._id.toString(), item.tasksCompleted);
    }

    const hoursByAssignee = new Map<string, number>();
    for (const item of facetResults?.topPerformersHours || []) {
      if (item._id) hoursByAssignee.set(item._id.toString(), Math.round((item.totalSeconds / 3600) * 10) / 10);
    }

    const allAssigneeIds = Array.from(new Set([...completedByAssignee.keys(), ...hoursByAssignee.keys()]));
    let topPerformers: Array<{
      employeeId: string;
      name: string;
      avatarUrl: string;
      tasksCompleted: number;
      hoursLogged: number;
    }> = [];

    if (allAssigneeIds.length > 0) {
      const validObjectIds = allAssigneeIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
      const employees = await this.employeeModel.find({ _id: { $in: validObjectIds } }).exec();
      const employeeMap = new Map<string, Employee>();
      for (const emp of employees) {
        employeeMap.set(emp._id.toString(), emp);
      }

      topPerformers = allAssigneeIds.map((empId) => {
        const emp = employeeMap.get(empId);
        const empName = emp
          ? `${emp.fullName?.firstName || ''} ${emp.fullName?.lastName || ''}`.trim() || emp.email || 'Employee'
          : 'Employee';
        return {
          employeeId: empId,
          name: empName,
          avatarUrl: '',
          tasksCompleted: completedByAssignee.get(empId) || 0,
          hoursLogged: hoursByAssignee.get(empId) || 0,
        };
      });

      topPerformers.sort((a, b) => {
        if (b.tasksCompleted !== a.tasksCompleted) {
          return b.tasksCompleted - a.tasksCompleted;
        }
        return b.hoursLogged - a.hoursLogged;
      });

      topPerformers = topPerformers.slice(0, 5);
    }

    // 8. Specific Employee Analytics (Working Hours Breakdown & GitHub-Style Heatmap)
    let employeeDailyHours: Array<{ date: string; dayName: string; hours: number; tasksCount: number }> = [];
    let employeeYearlyActivity: {
      days: Array<{ date: string; hours: number; count: number; level: 0 | 1 | 2 | 3 | 4 }>;
      currentStreak: number;
      longestStreak: number;
      totalYearHours: number;
      activeDays: number;
    } = {
      days: [],
      currentStreak: 0,
      longestStreak: 0,
      totalYearHours: 0,
      activeDays: 0,
    };

    if (selectedEmployee) {
      const selectedEmpId = selectedEmployee._id;
      const selectedEmail = selectedEmployee.email;

      const employeeMatchCondition: any[] = [
        { 'timeEntries.assigneeId': selectedEmpId },
        { assignee: selectedEmpId },
      ];
      if (selectedEmail) {
        employeeMatchCondition.push({
          'timeEntries.user.email': { $regex: new RegExp(`^${selectedEmail.trim()}$`, 'i') },
        });
      }

      // A) Daily Hours for Selected Range (for Employee Working Hours Chart)
      const dailyAgg = await this.taskModel.aggregate([
        { $unwind: '$timeEntries' },
        {
          $match: {
            $and: [
              { 'timeEntries.startTime': { $gte: currentStart, $lte: currentEnd } },
              { $or: employeeMatchCondition },
            ],
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timeEntries.startTime' },
            },
            totalSeconds: { $sum: '$timeEntries.durationSeconds' },
            tasksCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const dailyMap = new Map<string, { seconds: number; tasksCount: number }>();
      for (const d of dailyAgg) {
        dailyMap.set(d._id, { seconds: d.totalSeconds, tasksCount: d.tasksCount });
      }

      // Generate all calendar days in range
      const cur = new Date(currentStart);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      while (cur <= currentEnd) {
        const y = cur.getFullYear();
        const m = (cur.getMonth() + 1).toString().padStart(2, '0');
        const dt = cur.getDate().toString().padStart(2, '0');
        const dateStr = `${y}-${m}-${dt}`;
        const dataForDay = dailyMap.get(dateStr) || { seconds: 0, tasksCount: 0 };
        employeeDailyHours.push({
          date: dateStr,
          dayName: dayNames[cur.getDay()],
          hours: Math.round((dataForDay.seconds / 3600) * 10) / 10,
          tasksCount: dataForDay.tasksCount,
        });
        cur.setDate(cur.getDate() + 1);
      }

      // B) GitHub-Style 52-Week (365 days) Activity Heatmap
      const yearStart = new Date(now);
      // Align to Monday 52 weeks ago
      yearStart.setDate(yearStart.getDate() - 364);
      const yDay = yearStart.getDay();
      const diffToMon = (yDay === 0 ? -6 : 1) - yDay;
      yearStart.setDate(yearStart.getDate() + diffToMon);
      yearStart.setHours(0, 0, 0, 0);

      const yearlyAgg = await this.taskModel.aggregate([
        { $unwind: '$timeEntries' },
        {
          $match: {
            $and: [
              { 'timeEntries.startTime': { $gte: yearStart, $lte: now } },
              { $or: employeeMatchCondition },
            ],
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timeEntries.startTime' },
            },
            totalSeconds: { $sum: '$timeEntries.durationSeconds' },
            tasksCount: { $sum: 1 },
          },
        },
      ]);

      const yearlyMap = new Map<string, { seconds: number; count: number }>();
      for (const item of yearlyAgg) {
        yearlyMap.set(item._id, { seconds: item.totalSeconds, count: item.tasksCount });
      }

      const yearlyDays: Array<{ date: string; hours: number; count: number; level: 0 | 1 | 2 | 3 | 4 }> = [];
      let totalYearSeconds = 0;
      let activeDaysCount = 0;

      const cursor = new Date(yearStart);
      while (cursor <= now) {
        const y = cursor.getFullYear();
        const m = (cursor.getMonth() + 1).toString().padStart(2, '0');
        const dt = cursor.getDate().toString().padStart(2, '0');
        const dateStr = `${y}-${m}-${dt}`;

        const entry = yearlyMap.get(dateStr) || { seconds: 0, count: 0 };
        const h = Math.round((entry.seconds / 3600) * 10) / 10;
        totalYearSeconds += entry.seconds;
        if (h > 0) activeDaysCount++;

        yearlyDays.push({
          date: dateStr,
          hours: h,
          count: entry.count,
          level: this.getLevel(h),
        });

        cursor.setDate(cursor.getDate() + 1);
      }

      // Calculate Streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let runningStreak = 0;

      for (let i = 0; i < yearlyDays.length; i++) {
        if (yearlyDays[i].hours > 0) {
          runningStreak++;
          if (runningStreak > longestStreak) {
            longestStreak = runningStreak;
          }
        } else {
          runningStreak = 0;
        }
      }

      // Current streak: count backwards from end
      for (let i = yearlyDays.length - 1; i >= 0; i--) {
        if (yearlyDays[i].hours > 0) {
          currentStreak++;
        } else {
          // If today has 0 hours so far, allow counting from yesterday
          if (i === yearlyDays.length - 1) {
            continue;
          }
          break;
        }
      }

      employeeYearlyActivity = {
        days: yearlyDays,
        currentStreak,
        longestStreak,
        totalYearHours: Math.round((totalYearSeconds / 3600) * 10) / 10,
        activeDays: activeDaysCount,
      };
    }

    // 9. Selected employee / current user recent activity feed
    let userRecentActivity: any[] = [];
    if (selectedEmployee) {
      const empId = selectedEmployee._id;
      const empEmail = selectedEmployee.email || email;
      const empFirstName = (selectedEmployee.fullName?.firstName || '').trim();
      const empFullName = `${selectedEmployee.fullName?.firstName || ''} ${selectedEmployee.fullName?.lastName || ''}`.trim() || empEmail || 'User';

      const orUserConditions: any[] = [
        { 'updates.assigneeId': empId },
      ];
      if (empEmail) {
        orUserConditions.push({ 'updates.user.email': { $regex: new RegExp(`^${empEmail.trim()}$`, 'i') } });
      }
      if (empFirstName) {
        orUserConditions.push({ 'updates.user.name': { $regex: new RegExp(`^${empFirstName}`, 'i') } });
      }

      const matchQuery: any = {
        $or: [
          { assignee: empId },
          ...orUserConditions,
        ],
      };
      if (userId && Types.ObjectId.isValid(userId)) {
        matchQuery.$or.push({ userId: new Types.ObjectId(userId) });
      }

      try {
        const userActResult = await this.taskModel.aggregate([
          { $match: matchQuery },
          { $unwind: '$updates' },
          {
            $match: {
              $or: [
                ...orUserConditions,
                { assignee: empId },
              ],
            },
          },
          { $sort: { 'updates.timestamp': -1 } },
          { $limit: 20 },
          {
            $project: {
              _id: 0,
              taskId: { $toString: '$_id' },
              taskTitle: '$title',
              user: {
                name: { $ifNull: ['$updates.user.name', empFullName] },
                avatarUrl: '$updates.user.avatarUrl',
              },
              type: '$updates.type',
              message: '$updates.message',
              timestamp: '$updates.timestamp',
            },
          },
        ]);
        userRecentActivity = userActResult;
      } catch (err) {
        console.error('Error fetching userRecentActivity:', err);
      }
    }

    return {
      employeesList: allEmployees.map((e) => ({
        _id: e._id.toString(),
        name: `${e.fullName?.firstName || ''} ${e.fullName?.lastName || ''}`.trim() || e.email || 'Employee',
        email: e.email,
        role: e.role,
        department: e.department,
        status: e.status,
      })),
      selectedEmployee: selectedEmployee
        ? {
            _id: selectedEmployee._id.toString(),
            name: `${selectedEmployee.fullName?.firstName || ''} ${selectedEmployee.fullName?.lastName || ''}`.trim() || selectedEmployee.email || 'Employee',
            email: selectedEmployee.email,
            role: selectedEmployee.role,
            department: selectedEmployee.department,
            status: selectedEmployee.status,
            joiningDate: selectedEmployee.joiningDate,
          }
        : null,
      employeeDailyHours,
      employeeYearlyActivity,
      kpis: {
        tasksCompleted: {
          count: userTasksCompleted,
        },
        openTasks: {
          total: userOpenTasks,
          overdue: userOpenTasksOverdue,
        },
      },
      completionTrend: userCompletionTrend,
      departmentPerformance: facetResults?.departmentPerformance || [],
      statusDistribution: userStatusDistribution,
      topPerformers,
      recentActivity: userRecentActivity.length > 0 ? userRecentActivity : (facetResults?.recentActivity || []),
      liveNow: facetResults?.liveNow || [],
    };
  }
}
