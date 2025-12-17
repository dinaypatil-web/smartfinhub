/*
# Remove Quick Links Feature

This migration removes the quick_links table and all associated database objects.

## Changes
1. Drop the quick_links table
2. Remove all associated indexes, policies, and triggers

## Reason
Feature removed due to issues and user request.
*/

-- Drop the quick_links table (this will cascade and remove all policies, triggers, and indexes)
DROP TABLE IF EXISTS quick_links CASCADE;
