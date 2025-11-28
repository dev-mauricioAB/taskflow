import { prisma } from "../database/prisma.client";
import {
  CursorListParams,
  CursorPage,
  OffsetListParams,
  OffsetPage,
  Project,
  ProjectSortBy,
  TCreateProjectDto,
  TUpdateProjectDto,
} from "@repo/shared";
import {
  IProjectRepository,
  ProjectFilters,
} from "../interfaces/IProjectRepository";
import { NewEntity } from "../interfaces";
import { buildProjectWhere } from "./helpers";
import { DomainError } from "../errors";
import { HandleAllPrismaErrors } from "../database/decorators/handle-prisma-errors";

@HandleAllPrismaErrors
export class ProjectRepository implements IProjectRepository {
  async findById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({ where: { id } });
  }

  async save(project: Project): Promise<void> {
    if (project.id) {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          // include only mutable fields from your Project schema
          name: project.name,
          description: project.description,
          ownerId: project.ownerId,
          // ...other updatable fields
        },
      });
      return;
    }

    await prisma.project.create({
      data: {
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        // ...other creatable fields
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.project.delete({ where: { id } });
  }

  async create(dto: TCreateProjectDto): Promise<Project> {
    const user = await prisma.user.findUnique({ where: { id: dto.ownerId } });
    if (!user) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: "Owner user not found",
      });
    }

    const data: NewEntity<Project> = {
      ownerId: dto.ownerId,
      name: dto.name.trim(),
      description: dto.description?.trim(),
    };

    return prisma.project.create({ data });
  }

  async findAll(
    params: OffsetListParams<ProjectSortBy> & ProjectFilters,
  ): Promise<OffsetPage<Project, ProjectSortBy>> {
    const {
      q,
      ownerId,
      limit = 20,
      offset = 0,
      includeDeleted = false,
      sortBy = "createdAt",
      sortDir = "desc",
    } = params;

    const where = buildProjectWhere({ q, ownerId, includeDeleted });

    const [data, total] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        take: limit,
        skip: offset,
      }),
      prisma.project.count({ where }),
    ]);

    return { data, total, limit, offset, sortBy, sortDir };
  }

  async findAllCursor(
    params: CursorListParams<ProjectSortBy> & ProjectFilters,
  ): Promise<CursorPage<Project, ProjectSortBy>> {
    const {
      q,
      ownerId,
      includeDeleted = false,
      take = 20,
      cursor,
      sortBy = "name",
      sortDir = "asc",
    } = params;

    const where = buildProjectWhere({ q, ownerId, includeDeleted });

    // OrderBy stays as-is:
    const orderBy =
      sortBy === "name"
        ? [{ name: sortDir }, { id: sortDir }]
        : [{ [sortBy]: sortDir }, { name: sortDir }, { id: sortDir }];

    const forward = take >= 0;
    const pageSize = Math.min(Math.abs(take || 20), 100);

    const rows = await prisma.project.findMany({
      where,
      orderBy,
      take: (forward ? 1 : -1) * (pageSize + 1),
      skip: cursor ? 1 : undefined,
      cursor: cursor ? { id: cursor.id } : undefined,
    });

    const normalized = forward ? rows : [...rows].reverse();

    const hasMore = normalized.length > pageSize;
    const data = hasMore ? normalized.slice(0, pageSize) : normalized;

    // Emit only the direction-appropriate cursor
    let nextCursor: { id: string } | undefined;
    let prevCursor: { id: string } | undefined;

    if (forward) {
      nextCursor = hasMore
        ? { id: String(data[data.length - 1]?.id) }
        : undefined;
      prevCursor = undefined;
    } else {
      prevCursor =
        hasMore && data.length ? { id: String(data[0]?.id) } : undefined;
      nextCursor = undefined;
    }

    return {
      data,
      nextCursor,
      prevCursor,
      sortBy: sortBy as ProjectSortBy,
      sortDir,
    };
  }

  async findByOwnerId(ownerId: string): Promise<Project[]> {
    return prisma.project.findMany({ where: { ownerId } });
  }

  async softDelete(projectId: string, when: Date): Promise<boolean> {
    const res = await prisma.project.updateMany({
      where: { id: projectId, deletedAt: null },
      data: { deletedAt: when },
    });
    return res.count > 0; // idempotent soft delete
  }

  async hardDelete(projectId: string): Promise<boolean> {
    const res = await prisma.project.deleteMany({ where: { id: projectId } });
    return res.count > 0; // idempotent hard delete
  }

  async exists(projectId: string): Promise<boolean> {
    const row = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    return !!row; // fast existence check
  }

  async isSoftDeleted(projectId: string): Promise<boolean> {
    const row = await prisma.project.findUnique({
      where: { id: projectId },
      select: { deletedAt: true },
    });
    return !!row?.deletedAt; // check tombstone marker
  }

  async update(
    projectId: string,
    dto: TUpdateProjectDto,
  ): Promise<TUpdateProjectDto> {
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: dto,
      select: {
        id: true,
        name: true,
        description: true,
        ownerId: true,
        updatedAt: true,
      },
    }); // Prisma returns updated fields and timestamps

    return updated; // report changed fields and updatedAt
  }
}
