<template>
  <div class="about">
    <h1>This is an about page</h1>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Emit, Ref } from 'vue-property-decorator';

export default class About extends Vue {
  @Prop() private active: symbol | undefined
  created(): void {
    console.log('test');
  }
}
</script>