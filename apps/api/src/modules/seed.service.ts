import { Injectable, Logger } from '@nestjs/common';
import { DepartmentsService } from './departments/departments.service';
import { ServicesService } from './services/services.service';
import { DocumentsService } from './documents/documents.service';
import { UsersService } from './users/users.service';
import { AuthService } from './auth/auth.service';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private departmentsService: DepartmentsService,
    private servicesService: ServicesService,
    private documentsService: DocumentsService,
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  async onModuleInit() {
    await this.seedDepartments();
    await this.seedUsers();
  }

  private async seedDepartments() {
    const existingDepartments = await this.departmentsService.findAll();
    if (existingDepartments.length > 0) {
      return;
    }

    const passportDept = await this.departmentsService.create({
      name: 'Passport Services',
      description: 'Services for passport renewal and new applications.',
    });

    const civilDept = await this.departmentsService.create({
      name: 'Civil Records',
      description: 'Birth, marriage and address verification services.',
    });

    const passportRenewal = await this.servicesService.create({
      name: 'Passport Renewal',
      description: 'Renew your existing passport with the right documents.',
      department: passportDept._id,
    });

    const birthCertificate = await this.servicesService.create({
      name: 'Birth Certificate Request',
      description: 'Request a certified copy of your birth certificate.',
      department: civilDept._id,
    });

    await this.documentsService.create({
      name: 'Passport Copy',
      description: 'A scan or photo of your current passport.',
      service: passportRenewal._id,
    });
    await this.documentsService.create({
      name: 'Proof of Address',
      description: 'Recent utility bill or bank statement with your address.',
      service: passportRenewal._id,
    });
    await this.documentsService.create({
      name: 'Identity Card',
      description: 'A photo or scan of your national ID card.',
      service: birthCertificate._id,
    });
    await this.documentsService.create({
      name: 'Birth Record',
      description: 'Any previously issued birth document or certificate.',
      service: birthCertificate._id,
    });

    this.logger.log('Seeded departments, services, and required documents.');
  }

  private async seedUsers() {
    const existingUser = await this.usersService.findByEmail('user@example.com');
    if (existingUser) {
      return;
    }

    await this.authService.register('user@example.com', 'Password123!', 'Demo User');
    this.logger.log('Seeded default demo user.');
  }
}
