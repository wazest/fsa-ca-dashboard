<template>
  <nav class="navigation">
    <router-link to="/" class="nav-link">Dashboard</router-link>
    <router-link to="/finance" class="nav-link">Finance</router-link>
  </nav>
  <router-view />
</template>

<script setup lang="ts">
// App component logic will go here
</script>

<style>
.navigation {
  background: white;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.nav-link {
  color: #1a519b;
  text-decoration: none;
  font-weight: bold;
  padding: 0.5rem 1rem;
  margin-right: 1rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.nav-link:hover {
  background: #1a519b;
  color: white;
}

.router-link-active {
  background: #1a519b;
  color: white;
}
</style>