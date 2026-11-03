import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CATALOG_CATEGORIES } from "../data/catalog-categories";

@Injectable()
export class CategorySeedService {
  constructor(private readonly prisma: PrismaService) {}

  async seed() {
    const existing = await this.prisma.category.findMany({ select: { slug: true } });
    const existingSlugs = new Set(existing.map(item => item.slug));

    let mainCreated = 0;
    let mainUpdated = 0;
    let subCreated = 0;
    let subUpdated = 0;

    for (const [index, main] of CATALOG_CATEGORIES.entries()) {
      const mainData = {
        nameAr: main.nameAr,
        nameEn: main.nameEn,
        nameHe: main.nameHe,
        icon: main.icon,
        isActive: true,
        sortOrder: (index + 1) * 10,
        parentId: null,
      };

      const existed = existingSlugs.has(main.slug);
      const parent = await this.prisma.category.upsert({
        where: { slug: main.slug },
        create: { slug: main.slug, ...mainData },
        update: mainData,
      });
      if (existed) { mainUpdated += 1; } else { mainCreated += 1; existingSlugs.add(main.slug); }

      for (const [childIndex, child] of main.children.entries()) {
        const childData = {
          nameAr: child.nameAr,
          nameEn: child.nameEn,
          nameHe: child.nameHe,
          icon: main.icon,
          isActive: true,
          sortOrder: (index + 1) * 10 + childIndex + 1,
          parentId: parent.id,
        };

        const childExisted = existingSlugs.has(child.slug);
        await this.prisma.category.upsert({
          where: { slug: child.slug },
          create: { slug: child.slug, ...childData },
          update: childData,
        });
        if (childExisted) { subUpdated += 1; } else { subCreated += 1; existingSlugs.add(child.slug); }
      }
    }

    const all = await this.prisma.category.findMany({ select: { parentId: true } });
    return {
      mainCreated,
      mainUpdated,
      subCreated,
      subUpdated,
      totalMain: all.filter(c => !c.parentId).length,
      totalSub: all.filter(c => c.parentId).length,
    };
  }
}
