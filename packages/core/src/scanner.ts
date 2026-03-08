/**
 * Base scanner utilities
 */

import { ScanModule, ScanResult } from "./types.js";

/**
 * Get scanner by name
 */
export function getScannerByName(
  scanModules: ScanModule[],
  name: string
): ScanModule | undefined {
  return scanModules.find((s) => s.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get all scanner names
 */
export function getAllScannerNames(scanModules: ScanModule[]): string[] {
  return scanModules.map((s) => s.name);
}

/**
 * Get scanner description
 */
export function getScannerDescription(
  scanModules: ScanModule[],
  name: string
): string | undefined {
  const scanner = getScannerByName(scanModules, name);
  return scanner?.description;
}
