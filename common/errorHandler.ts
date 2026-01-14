import { AnchorError } from '@coral-xyz/anchor';
import { SendTransactionError } from '@solana/web3.js';

export function createUserError(message: string, suggestions?: string[]): Error {
  const error = new Error(message);
  (error as Error & { isUserActionable: boolean; suggestions?: string[] }).isUserActionable = true;
  if (suggestions) {
    (error as Error & { suggestions?: string[] }).suggestions = suggestions;
  }
  return error;
}

export function isUserActionableError(error: unknown): boolean {
  if (error instanceof Error) {
    return (error as Error & { isUserActionable?: boolean }).isUserActionable === true;
  }
  return false;
}

export function isAccountNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const errorMessage = error.message.toLowerCase();
  return (
    errorMessage.includes('account does not exist') ||
    errorMessage.includes('invalidaccountdata') ||
    errorMessage.includes('failed to get account')
  );
}

function extractErrorMessage(error: unknown): { message: string; isUserActionable: boolean } {
  if (error instanceof AnchorError) {
    const anchorError = error as AnchorError;
    const errorMessage = anchorError.error?.errorMessage || anchorError.message;
    return { message: errorMessage, isUserActionable: true };
  }

  if (error instanceof SendTransactionError) {
    const txError = error as SendTransactionError;
    const logs = txError.logs || [];
    const errorLog = logs.find((log) => log.includes('Error:') || log.includes('failed'));
    return {
      message: errorLog || txError.message || 'Transaction failed',
      isUserActionable: false,
    };
  }

  if (error instanceof Error) {
    return { message: error.message, isUserActionable: isAccountNotFoundError(error) };
  }

  return {
    message: String(error),
    isUserActionable: false,
  };
}

export function handleError(error: unknown): never {
  if (isUserActionableError(error)) {
    const err = error as Error & { suggestions?: string[] };
    console.error(err.message);
    if (err.suggestions && err.suggestions.length > 0) {
      console.error('\nSuggestions:');
      err.suggestions.forEach((suggestion) => {
        console.error(`  • ${suggestion}`);
      });
    }
    process.exit(1);
  }

  const { message, isUserActionable } = extractErrorMessage(error);

  if (isUserActionable) {
    console.error(message);
    process.exit(1);
  }

  console.error(`ERROR! 🔴 ${message}`);
  if (error instanceof Error && error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(2);
}
