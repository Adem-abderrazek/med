-- Medicare Database Setup Script
-- Run this script after installing PostgreSQL
-- This matches your current .env configuration

-- Create the database (matching your .env file)
CREATE DATABASE "MediCare";

-- Connect to the database
\c "MediCare";

-- The postgres user already has all privileges
-- Just ensure the database is ready for Prisma migrations
