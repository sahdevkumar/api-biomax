-- Sample seed data for development
insert into devices (device_id, name, location, status, firmware_version) values
  ('BM30W-001A', 'Main Entrance', 'Ground Floor', 'ONLINE', '6.60'),
  ('BM160W-002B', 'Server Room', 'Basement', 'OFFLINE', '6.55'),
  ('VTA45-003C', 'HR Department', 'Floor 2', 'ONLINE', '6.60')
on conflict (device_id) do nothing;

insert into users (employee_code, full_name, email, department, role) values
  ('EMP001', 'Arjun Sharma',   'arjun@company.com',   'Engineering',    'USER'),
  ('EMP002', 'Priya Singh',    'priya@company.com',   'HR',             'MANAGER'),
  ('EMP003', 'Rahul Verma',    'rahul@company.com',   'Engineering',    'USER'),
  ('EMP004', 'Sneha Gupta',    'sneha@company.com',   'Finance',        'USER'),
  ('EMP005', 'Admin User',     'admin@company.com',   'IT',             'ADMIN')
on conflict (employee_code) do nothing;
