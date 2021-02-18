<template>
  <div class="about">
    <h1 v-for="repository in repositories" :key="repository.value">
      {{ repository.name }}
    </h1>
  </div>
</template>

<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator';
import { Repository } from '@/utils/types';

@Component

export default class Repositories extends Vue {
  @Prop(Array) private readonly repositories!: Repository[]
}
</script>