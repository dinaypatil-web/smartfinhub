/*
# Migration 00032: Atomic Balance Adjustment Function

## Overview
Replaces vulnerable client-side read-modify-write balance adjustments with
an atomic server-side database procedure to eliminate concurrency race conditions.

## Changes
1. Creates `adjust_account_balance` procedure using atomic `UPDATE accounts SET balance = balance + delta`.
2. Automatically updates `updated_at` timestamp.
3. Uses `SECURITY DEFINER` with explicit search path.
*/

CREATE OR REPLACE FUNCTION public.adjust_account_balance(
  p_account_id UUID,
  p_adjustment NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE public.accounts
  SET balance = balance + p_adjustment,
      updated_at = NOW()
  WHERE id = p_account_id
  RETURNING balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;

COMMENT ON FUNCTION public.adjust_account_balance IS 'Atomically updates account balance using row locking to prevent race conditions.';
