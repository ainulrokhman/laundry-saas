/**
 * COGS Simulation Service
 * 
 * Business logic untuk pembuatan & pengelolaan simulasi HPP per layanan.
 */

import { BaseService } from "./BaseService";
import { SessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type CreateSimulationItemInput = {
  name: string;
  cost: number;
  usage: number;
};

export type CreateSimulationInput = {
  name: string;
  description?: string;
  items: CreateSimulationItemInput[];
};

export class CogsSimulationService extends BaseService {
  /**
   * List simulations for the active outlet
   */
  async listSimulations(user: SessionUser | null) {
    this.requireRole(user, ["OWNER"]);
    const outletId = this.getOutletId(user);

    return await prisma.cogsSimulation.findMany({
      where: { outletId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Create a new HPP simulation
   */
  async createSimulation(user: SessionUser | null, input: CreateSimulationInput) {
    this.requireRole(user, ["OWNER"]);
    const outletId = this.getOutletId(user);

    if (!input.items || input.items.length === 0) {
      throw new Error("Minimal satu komponen biaya harus ditambahkan");
    }

    let totalCogs = 0;
    const itemsData = input.items.map((item) => {
      const subtotal = item.cost * item.usage;
      totalCogs += subtotal;
      return {
        name: item.name,
        cost: item.cost,
        usage: item.usage,
        subtotal: subtotal,
      };
    });

    return await prisma.cogsSimulation.create({
      data: {
        outletId,
        name: input.name,
        description: input.description,
        totalCogs: totalCogs,
        items: {
          create: itemsData,
        },
      },
      include: { items: true },
    });
  }

  /**
   * Delete simulation
   */
  async deleteSimulation(user: SessionUser | null, id: string) {
    this.requireRole(user, ["OWNER"]);
    const outletId = this.getOutletId(user);

    // Safety check
    const existing = await prisma.cogsSimulation.findFirst({
      where: { id, outletId },
    });
    if (!existing) throw new Error("Simulasi tidak ditemukan");

    return await prisma.cogsSimulation.delete({
      where: { id },
    });
  }

  /**
   * Apply simulation result to a service
   */
  async applyToService(user: SessionUser | null, simulationId: string, serviceId: string) {
    this.requireRole(user, ["OWNER"]);
    const outletId = this.getOutletId(user);

    const simulation = await prisma.cogsSimulation.findFirst({
      where: { id: simulationId, outletId },
    });
    if (!simulation) throw new Error("Simulasi tidak ditemukan");

    const service = await prisma.service.findFirst({
      where: { id: serviceId, outletId },
    });
    if (!service) throw new Error("Layanan tidak ditemukan");

    return await prisma.service.update({
      where: { id: serviceId },
      data: {
        cogs: simulation.totalCogs,
      },
    });
  }
}
