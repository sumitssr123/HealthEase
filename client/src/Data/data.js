// user menu (patient and normal user)
export const userMenu = [
  {
    name: "Home",
    path: "/dashboard", // path ko / se badal kar /dashboard kar diya
    icon: "fa-solid fa-house-medical",
  },
  {
    name: "My Appointments",
    path: "/appointments",
    icon: "fa-solid fa-calendar-check",
  },
  {
    name: "Apply as Doctor",
    path: "/apply-doctor",
    icon: "fa-solid fa-user-doctor",
  },
  {
    name: "My Profile",
    path: "/profile",
    icon: "fa-solid fa-user-gear",
  },
];

// admin menu (system admin)
export const adminMenu = [
  {
    name: "Home", 
    path: "/dashboard", // path ko / se badal kar /dashboard kar diya
    icon: "fa-solid fa-chart-pie", 
  },
  {
    name: "Manage Doctors",
    path: "/admin/doctors",
    icon: "fa-solid fa-stethoscope",
  },
  {
    name: "Manage Users",
    path: "/admin/users",
    icon: "fa-solid fa-hospital-user",
  },
];