import { deliverCourseMail } from './course_delivery_service.js';

const request = {
  domain: 'courses.example.com',
  dkimSelector: 'mail1',
  dkimValue: 'dkim.courses.example.com',
  educatorEmail: 'educator@example.com',
  courseTitle: 'Algebra I',
  today: '2024-01-15',
  learners: [
    {
      email: 'sam@school.test',
      fullName: 'Sam Carter',
      dueOn: '2024-01-10',
      courseStatus: 'active'
    },
    {
      email: 'lee@school.test',
      fullName: 'Lee Ortiz',
      dueOn: '2024-01-20',
      courseStatus: 'active'
    },
    {
      email: 'ana@school.test',
      fullName: 'Ana Doyle',
      dueOn: '2024-01-12',
      courseStatus: 'completed'
    }
  ]
};

deliverCourseMail(request)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
