# Backup & Restore Feature Guide

## Overview
SmartFinHub now includes a comprehensive backup and restore system that allows users to export all their financial data to a file and restore it later.

## Accessing the Feature
Navigate to **Backup & Restore** from the main navigation menu.

## Backup Process

### What Gets Backed Up
- All bank accounts, credit card accounts, and loan accounts
- Complete transaction history
- Budget information
- Interest rate history for floating rate loans
- Loan EMI payment records

### How to Create a Backup
1. Click the "Download Backup" button
2. A JSON file will be downloaded automatically
3. Filename format: smartfinhub-backup-YYYY-MM-DD.json

## Restore Process

### Important Warning
Restoring data will permanently delete all your current data and replace it with the backup. This action cannot be undone.

### How to Restore Data
1. Click "Select Backup File"
2. Choose a previously downloaded backup file
3. Review the backup information
4. Click "Restore Data" to confirm
5. Wait for completion and page refresh

## Best Practices
- Create backups regularly, especially before major changes
- Store backup files securely (encrypted storage recommended)
- Keep multiple backup copies in different locations
- Test your backups periodically

## Security
- Backup files contain sensitive financial information
- Store them securely and never share with others
- Use encrypted cloud storage or password-protected folders
