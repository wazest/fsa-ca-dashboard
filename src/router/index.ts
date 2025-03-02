import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "../components/Dashboard.vue";
import Finance from "../components/Finance.vue";
import Bookings from "../components/Bookings.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Dashboard",
      component: Dashboard,
    },
    {
      path: "/finance",
      name: "Finance",
      component: Finance,
    },
    {
      path: "/bookings",
      name: "Bookings",
      component: Bookings,
    },
  ],
});

export default router;
