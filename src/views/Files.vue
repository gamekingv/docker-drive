<template>
    <div id="files">
        <HelloWorld :msg="result" />
        <v-dialog v-model="loading" persistent width="300">
            <v-card color="primary" dark>
                <v-card-text>
                    {{ $t("loading") }}
                    <v-progress-linear
                        indeterminate
                        color="white"
                        class="mb-0"
                    ></v-progress-linear>
                </v-card-text>
            </v-card>
        </v-dialog>
    </div>
</template>

<script lang="ts">
// @ is an alias to /src
import HelloWorld from '@/components/HelloWorld.vue';
import axios from 'axios';

export default {
    name: 'Files',
    components: {
        HelloWorld
    },
    data: () => ({
        loading: true,
        result: ''
    }),
    async mounted() {
        try {
            const response = await axios.get('/user?ID=12345');
            console.log(response);
        } catch (error) {
            console.error(error);
        }
        setTimeout(() => this.loading = false, 2000);
    }
};
</script>
