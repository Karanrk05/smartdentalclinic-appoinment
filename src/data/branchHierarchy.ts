import { ClinicBranch, Doctor, Treatment, BranchDentist, BranchHierarchyItem, DEFAULT_BRANCHES } from '../types';
import { DOCTORS } from './doctors';
import { GENERAL_TREATMENTS } from './treatments';

// Helper lookup maps
const doctorsMap = new Map<string, Doctor>(DOCTORS.map((d) => [d.id, d]));
const treatmentsMap = new Map<string, Treatment>(GENERAL_TREATMENTS.map((t) => [t.id, t]));

/**
 * Canonical Multi-Branch Hierarchy:
 * Branch -> Dentists -> Services
 * 
 * Downtown Central (branch-1):
 *   - Dr. Vikram Shah: t1, t2, t3, t7, t9, t10
 *   - Dr. Priya Mehta: t1, t2, t3, t4, t5, t6, t8, t10
 * 
 * Westside Smiles Hub (branch-2):
 *   - Dr. Priya Mehta: t1, t3, t4, t5, t6, t8
 *   - Dr. Arjun Rao: t1, t2, t3, t6, t7, t8, t10
 * 
 * Green Hills Dental Studio (branch-3):
 *   - Dr. Sneha Kulkarni: t1, t3, t4, t5, t6, t8, t10
 *   - Dr. Vikram Shah: t1, t2, t3, t7, t9
 */

interface RawBranchNode {
  branchId: string;
  dentists: {
    dentistId: string;
    serviceIds: string[];
  }[];
}

export const RAW_BRANCH_HIERARCHY: RawBranchNode[] = [
  {
    branchId: 'branch-1',
    dentists: [
      {
        dentistId: 'doc1', // Dr. Vikram Shah
        serviceIds: ['t1', 't2', 't3', 't7', 't9', 't10'],
      },
      {
        dentistId: 'doc2', // Dr. Priya Mehta
        serviceIds: ['t1', 't2', 't3', 't4', 't5', 't6', 't8', 't10'],
      },
    ],
  },
  {
    branchId: 'branch-2',
    dentists: [
      {
        dentistId: 'doc2', // Dr. Priya Mehta
        serviceIds: ['t1', 't3', 't4', 't5', 't6', 't8'],
      },
      {
        dentistId: 'doc4', // Dr. Arjun Rao
        serviceIds: ['t1', 't2', 't3', 't6', 't7', 't8', 't10'],
      },
    ],
  },
  {
    branchId: 'branch-3',
    dentists: [
      {
        dentistId: 'doc3', // Dr. Sneha Kulkarni
        serviceIds: ['t1', 't3', 't4', 't5', 't6', 't8', 't10'],
      },
      {
        dentistId: 'doc1', // Dr. Vikram Shah
        serviceIds: ['t1', 't2', 't3', 't7', 't9'],
      },
    ],
  },
];

/**
 * Builds the complete populated Branch -> Dentists -> Services hierarchy
 */
export function buildBranchHierarchy(): BranchHierarchyItem[] {
  return DEFAULT_BRANCHES.map((branch) => {
    const rawBranch = RAW_BRANCH_HIERARCHY.find((r) => r.branchId === branch.id);
    const rawDentists = rawBranch ? rawBranch.dentists : [];

    const dentists: BranchDentist[] = rawDentists
      .map((rd) => {
        const doc = doctorsMap.get(rd.dentistId);
        if (!doc) return null;

        const services: Treatment[] = rd.serviceIds
          .map((tid) => treatmentsMap.get(tid))
          .filter((t): t is Treatment => Boolean(t));

        return {
          ...doc,
          branchId: branch.id,
          serviceIds: rd.serviceIds,
          services,
        };
      })
      .filter((d): d is BranchDentist => Boolean(d));

    // Calculate unique services available across all dentists at this branch
    const allBranchServiceIds = new Set<string>();
    dentists.forEach((d) => d.serviceIds.forEach((id) => allBranchServiceIds.add(id)));

    const branchWithCounts: ClinicBranch = {
      ...branch,
      dentistIds: dentists.map((d) => d.id),
      dentistsCount: dentists.length,
      servicesCount: allBranchServiceIds.size,
    };

    return {
      branch: branchWithCounts,
      dentists,
    };
  });
}

export const BRANCH_HIERARCHY: BranchHierarchyItem[] = buildBranchHierarchy();

/**
 * Get all dentists available at a specific branch
 */
export function getDentistsForBranch(branchId: string): Doctor[] {
  const branchItem = BRANCH_HIERARCHY.find((b) => b.branch.id === branchId);
  if (!branchItem) {
    // Fallback: return default doctors if branch unknown
    return DOCTORS.slice(0, 2);
  }
  return branchItem.dentists;
}

/**
 * Get all services offered by a specific dentist at a specific branch
 */
export function getServicesForDentist(branchId: string, dentistId: string): Treatment[] {
  const branchItem = BRANCH_HIERARCHY.find((b) => b.branch.id === branchId);
  if (!branchItem) return GENERAL_TREATMENTS;

  const dentist = branchItem.dentists.find((d) => d.id === dentistId);
  if (!dentist) {
    // Fallback: return general treatments available at the branch
    return getServicesForBranch(branchId);
  }
  return dentist.services;
}

/**
 * Get all distinct services available at a specific branch across all its dentists
 */
export function getServicesForBranch(branchId: string): Treatment[] {
  const branchItem = BRANCH_HIERARCHY.find((b) => b.branch.id === branchId);
  if (!branchItem) return GENERAL_TREATMENTS;

  const serviceMap = new Map<string, Treatment>();
  branchItem.dentists.forEach((d) => {
    d.services.forEach((s) => {
      if (!serviceMap.has(s.id)) {
        serviceMap.set(s.id, s);
      }
    });
  });

  return Array.from(serviceMap.values());
}

/**
 * Check if a dentist is stationed at a specific branch
 */
export function isDentistAtBranch(branchId: string, dentistId: string): boolean {
  const branchItem = BRANCH_HIERARCHY.find((b) => b.branch.id === branchId);
  if (!branchItem) return false;
  return branchItem.dentists.some((d) => d.id === dentistId);
}

/**
 * Check if a service is offered by a dentist at a branch
 */
export function isServiceOfferedByDentist(branchId: string, dentistId: string, serviceId: string): boolean {
  const services = getServicesForDentist(branchId, dentistId);
  return services.some((s) => s.id === serviceId);
}
