import { MAX_U128 } from '@/test/constants/common.constants';

/**
 * Pricing and decimal constants used across the system
 * All prices are stored and processed in base-9 format (9 decimal places)
 */

/**
 * Number of decimal places used for price representation
 * Prices are stored as integers with 9 decimal places
 * Example: $1.00 is stored as 1_000_000_000
 */
export const PRICE_DECIMALS = 9;

/**
 * Number of decimal places used for manual price representation
 * Prices are stored as integers with 8 decimal places
 * Example: $1.00 is stored as 1_000_000_00
 */
export const MANUAL_PRICE_DECIMALS = 8;

/**
 * Multiplier for converting decimal price strings to base-9 integers
 * Used when converting config prices (e.g., "1.5") to on-chain format
 */
export const PRICE_MULTIPLIER = 10 ** PRICE_DECIMALS;

/**
 * Multiplier for converting decimal manual price strings to base-8 integers
 * Used when converting manual config prices (e.g., "1.5") to base-8 integers
 */
export const MANUAL_PRICE_MULTIPLIER = 10 ** MANUAL_PRICE_DECIMALS;

/**
 * Value representing unlimited/no limit for daily limits and allowances.
 * Derived from MAX_U128, divided by 10^9 to account for parseUnits conversion.
 * After parseUnits(UNLIMITED), the on-chain value will be close to MAX_U128.
 */
export const UNLIMITED = (MAX_U128 / BigInt(PRICE_MULTIPLIER)).toString();
