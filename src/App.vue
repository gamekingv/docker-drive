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
                <v-list-item v-for="[icon, text] in links" :key="icon" link>
                    <v-list-item-icon>
                        <v-icon>{{ icon }}</v-icon>
                    </v-list-item-icon>

                    <v-list-item-content>
                        <v-list-item-title>{{ text }}</v-list-item-title>
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
                class="py-8 px-6 overflow-y-auto"
                fluid
            >
                <v-row>
                    <v-col v-for="card in cards" :key="card" cols="12">
                        <v-card color="grey darken-3" elevation="6">
                            <v-subheader>{{ card }}</v-subheader>

                            <v-list color="grey darken-3" two-line>
                                <template v-for="n in 15">
                                    <v-list-item :key="n">
                                        <v-list-item-avatar
                                            color="grey darken-1"
                                        >
                                        </v-list-item-avatar>

                                        <v-list-item-content>
                                            <v-list-item-title>
                                                Message
                                                {{ n }}
                                            </v-list-item-title>

                                            <v-list-item-subtitle>
                                                Lorem ipsum dolor sit amet,
                                                consectetur adipisicing elit.
                                                Nihil repellendus distinctio
                                                similique
                                            </v-list-item-subtitle>
                                        </v-list-item-content>
                                    </v-list-item>

                                    <v-divider
                                        v-if="n !== 6"
                                        :key="`divider-${n}`"
                                        inset
                                    ></v-divider>
                                </template>
                            </v-list>
                        </v-card>
                    </v-col>
                </v-row>
            </v-container>
        </v-main>
    </v-app>
</template>

<script lang="ts">
export default {
    data: () => ({
        cards: ['Today'],
        drawer: null,
        links: [
            ['mdi-inbox-arrow-down', 'Inbox'],
            ['mdi-send', 'Send'],
            ['mdi-delete', 'Trash'],
            ['mdi-alert-octagon', 'Spam'],
        ],
    }),
};
</script>