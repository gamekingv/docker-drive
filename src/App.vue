<template>
    <v-app id="app">
        <v-navigation-drawer v-model="drawer" app>
            <v-list>
                <v-list-item>
                    <v-list-item-avatar size="50">
                        <v-icon large color="blue lighten-1"
                            >mdi-database-import</v-icon
                        >
                    </v-list-item-avatar>
                    <v-list-item-content>
                        <v-list-item-title class="text-h5">{{
                            $t("name")
                        }}</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>

            <v-divider></v-divider>

            <v-list nav dense>
                <v-list-item key="files" to="/" link>
                    <v-list-item-icon>
                        <v-icon>mdi-file-multiple</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>{{ $t("files") }}</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item key="repositories" to="/about" link>
                    <v-list-item-icon>
                        <v-icon>mdi-database-settings</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>{{
                            $t("repositories")
                        }}</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>

        <v-app-bar
            absolute
            elevate-on-scroll
            scroll-target="#main-container"
            app
        >
            <v-app-bar-nav-icon
                @click.stop="drawer = !drawer"
            ></v-app-bar-nav-icon>
            <v-toolbar-title>{{ $t("name") }}</v-toolbar-title>
        </v-app-bar>

        <v-main id="main" class="grey darken-3">
            <v-container
                id="main-container"
                class="py-8 px-6 overflow-y-auto overflow-x-hidden"
                fluid
            >
                <v-fade-transition duration="80" mode="out-in">
                    <router-view />
                </v-fade-transition>
            </v-container>
        </v-main>
    </v-app>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';

@Component

export default class APP extends Vue {
    drawer = true
}
</script>