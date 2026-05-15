import { Service } from '@connect/types';
import apiClient from './apiClient';

export function getServiceDepartmentId(service: Service): string | undefined {
  return typeof service.department === 'string'
    ? service.department
    : service.department?._id;
}

export async function getServicesForDepartment(
  departmentId: string,
): Promise<Service[]> {
  const departmentServicesRes = await apiClient.get<Service[]>(
    `/departments/${departmentId}/services`,
  );
  const departmentServices = departmentServicesRes.data || [];

  if (departmentServices.length > 0) {
    return departmentServices;
  }

  console.warn(
    '[Department services fallback] /departments/:id/services returned empty; filtering /services',
    { departmentId },
  );

  const allServicesRes = await apiClient.get<Service[]>('/services');
  return (allServicesRes.data || []).filter(
    (service) => getServiceDepartmentId(service) === departmentId,
  );
}
