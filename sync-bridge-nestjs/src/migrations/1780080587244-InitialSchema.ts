import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1780080587244 implements MigrationInterface {
    name = 'InitialSchema1780080587244'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_employees" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "employeeId" varchar NOT NULL, "firstName" varchar NOT NULL, "middleName" varchar, "lastName" varchar NOT NULL, "gender" varchar, "email" varchar NOT NULL, "phoneNumber" varchar, "dateOfBirth" datetime, "nationality" varchar, "jobLevel" varchar, "department" varchar, "location" varchar, "bankAccountNumber" varchar, "company" varchar, "jobTitle" varchar, "costCenter" varchar, "startDate" datetime, "employeeStatus" varchar, "managerId" varchar, "managerEmail" varchar, "lastModifiedOn" datetime, "lastModified" bigint, CONSTRAINT "UQ_765bc1ac8967533a04c74a9f6af" UNIQUE ("email"))`);
        await queryRunner.query(`INSERT INTO "temporary_employees"("id", "employeeId", "firstName", "middleName", "lastName", "gender", "email", "phoneNumber", "dateOfBirth", "nationality", "jobLevel", "department", "location", "bankAccountNumber", "company", "jobTitle", "costCenter", "startDate", "employeeStatus", "managerId", "managerEmail", "lastModifiedOn", "lastModified") SELECT "id", "employeeId", "firstName", "middleName", "lastName", "gender", "email", "phoneNumber", "dateOfBirth", "nationality", "jobLevel", "department", "location", "bankAccountNumber", "company", "jobTitle", "costCenter", "startDate", "employeeStatus", "managerId", "managerEmail", "lastModifiedOn", "lastModified" FROM "employees"`);
        await queryRunner.query(`DROP TABLE "employees"`);
        await queryRunner.query(`ALTER TABLE "temporary_employees" RENAME TO "employees"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" RENAME TO "temporary_employees"`);
        await queryRunner.query(`CREATE TABLE "employees" ("id" integer PRIMARY KEY NOT NULL, "employeeId" varchar NOT NULL, "firstName" varchar NOT NULL, "middleName" varchar, "lastName" varchar NOT NULL, "gender" varchar, "email" varchar NOT NULL, "phoneNumber" varchar, "dateOfBirth" datetime, "nationality" varchar, "jobLevel" varchar, "department" varchar, "location" varchar, "bankAccountNumber" varchar, "company" varchar, "jobTitle" varchar, "costCenter" varchar, "startDate" datetime, "employeeStatus" varchar, "managerId" varchar, "managerEmail" varchar, "lastModifiedOn" datetime, "lastModified" bigint, CONSTRAINT "UQ_765bc1ac8967533a04c74a9f6af" UNIQUE ("email"))`);
        await queryRunner.query(`INSERT INTO "employees"("id", "employeeId", "firstName", "middleName", "lastName", "gender", "email", "phoneNumber", "dateOfBirth", "nationality", "jobLevel", "department", "location", "bankAccountNumber", "company", "jobTitle", "costCenter", "startDate", "employeeStatus", "managerId", "managerEmail", "lastModifiedOn", "lastModified") SELECT "id", "employeeId", "firstName", "middleName", "lastName", "gender", "email", "phoneNumber", "dateOfBirth", "nationality", "jobLevel", "department", "location", "bankAccountNumber", "company", "jobTitle", "costCenter", "startDate", "employeeStatus", "managerId", "managerEmail", "lastModifiedOn", "lastModified" FROM "temporary_employees"`);
        await queryRunner.query(`DROP TABLE "temporary_employees"`);
    }

}
