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
import { Component, Vue } from 'vue-property-decorator';
import HelloWorld from '@/components/HelloWorld.vue';
import axios from 'axios';

@Component({
    components: {
        HelloWorld
    }
})

export default class Files extends Vue {
    loading = true
    result = ''
    mounted(): void {
        // const link = 'https://dockerauth.cn-hangzhou.aliyuncs.com/auth?service=registry.aliyuncs.com:cn-hangzhou:26842&scope=repository:kdjvideo/test:pull';
        const link = 'registry.cn-hangzhou.aliyuncs.com/kdjvideo/test';
        const [server, namespace, repository] = link.split('/');
        axios.get(`https://${server}/v2/${namespace}/${repository}/manifests/latest`).then(({ status, data }) => {
            console.log(status);
            this.result = JSON.stringify(data);
            this.loading = false;
        }).catch(error => {
            const { status, headers, data } = error.response;
            console.log(status, headers, data);
            const [, realm, service, , scope] = headers['www-authenticate']?.match(/^Bearer realm="([^"]*)",service="([^"]*)"(,scope="([^"]*)"|)$/);
            this.result = [realm, service, scope].join(' ');
            this.loading = false;
        });
    }
}
</script>
