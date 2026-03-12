import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface User {
    name: string;
    avatar: string;
    status?: 'active' | 'away';
}

interface PostData {
    id: string;
    author: User;
    timestamp: string;
    source: string;
    content: string;
    image?: string;
    likes: string;
    comments: number;
    shares: number;
}

@Component({
    selector: 'new-feeds-layout',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './newFeedsLayout.component.html',
    styleUrl: './newFeedsLayout.component.css'
})
export class NewFeedsLayoutComponent {
    currentUser: User = {
        name: "Operative",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD6ty9628Kraj11EHl8Yz-OCMHZVDfLmqfM1zlFPQfMghMKg85UMHjZZMUXjnJz-xSX6CeBC6uCkg7B7dYBPAbc9FFV_jT0uTDYLRoTcp584V-ejnsrq86sX2dfIhHmoEDT_Mnx-op1ZGhglKYK8gR_XhbE1jZLS43oJKmB9mwY2Co_-NFtUae9h2F0IXvqvi_nRQEojbQm8V-Ekgf4I5RD0ysaSsyTo-iOA-zvI7DJj2egr17RHZFOuY7t0p8UD8AuHMq5TfBQ4yw"
    };

    posts = signal<PostData[]>([
        {
            id: '1',
            author: {
                name: "Xenon_7",
                avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDgz14giDO6u0Feug6Sfs2ltl7EA-OpyYumVN88NNmARd7q9rfy54PqfNxjycdzIxHZAHRfYoelKab9SWxP2lGm0MjqUmWYbAeD_Z4B-yFQ1G5R771JMh_Id9vFtTABp6Fox6UhKrJIE8JCblJaZP9XUmSo4XJCv1p_n8Z-vTReyUaMAukVZAwzgDIepJPpXRsHKgbGPh7b9ju1Cc8wrpzMMWGFeJd44Vt7o4wfDEcsoDDY5SuWpBRRtCDKbhsIgS5_G0A03djgKe4"
            },
            timestamp: "2.4ms ago",
            source: "Neural Link",
            content: "Just integrated the new neon-mesh protocol. The latency is practically non-existent. Testing the high-bandwidth spatial rendering now. #CyberChat #FutureTech #NeonMesh",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD4S2gtjaSq8kK2Ya7qQYvTfmZuuZqxE_spXGMLmMi2oPEayxDdPRbrXzBi6DFOzp8fc9xzU71OvHxNAKIC3nrD3i7wuV2yakta-HlogfbVy7BGiNSDrfNJxtJCEl12uDut-bplg26UC3O1mcUe5wtwZ51BsxVEmLLGfw9PUUs8A5CniSsRbHkeZN37REaKEZnVSWZw9PsiVOz_XqNspW8vKeW4ytjf2BnOoNCn256fsR1yEEszAOO9pxxfF8qeQZPjQWhAEWx3fdw",
            likes: "1.2k",
            comments: 48,
            shares: 12
        },
        {
            id: '2',
            author: {
                name: "Koda_Stream",
                avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBkej5ThTleLZr-YEGUMNmJzp9zgkG0B77Hg55uJfDqpCQ-gBT6n_LOAopUkzmBPUzmUrVzUJwx_piuff1wIPHfdaH3Pp4aCqgE9KQtcoLCQkVoJgxASBIJBQmonGVGR7cQvPeqS2r9Eb4vS1XXUmkbr1Vhj07LHiVrEXOtZg-wgSmxOnEy7zpWfhOBc_iH6bEbrNbsEg-VttN2EzO04L1O8k3xXDd72h6x99jSM-CLGyigjpblkLHfNOPSK5VEjF4UuNL5quyGhYE"
            },
            timestamp: "15m ago",
            source: "Orbit Satellite",
            content: "Sunset over the Silicon Valley ruins. It's beautiful how the old world tech still glows in the dark. Reminds me why we built the Mesh.",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDt57s8ZvDIMSIMsyn7MxjZ5MNeWdmOvaJhbCjvwwOS4OzscXYvwxGsqeor1PkjaQuXet5fLFAmaeSNdY1uYkPnJR-LmP7Y-9_KfZUXcoY7lPc6ALLmh2R3SLODpNUAGZm0yX4OhzG9XRoAaTPxt9kB-ZMoMkGlo_J2v-ohBX4DdGF2GwcS4GbM1oAGkVXT1oHPmUEnpGvQcswWkfKVHTpD7UIJNqBrxV3c6OjzrtVpFYy2LrEWSHkb3hfLUT6BSzSZBND5MrVWrKw",
            likes: "854",
            comments: 12,
            shares: 5
        }
    ]);

    onlineNodes: User[] = [
        {
            name: "Vector_Prime",
            status: 'active',
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBlZdB4RoajkXTY6GLDxRzSWyrbERuBhmgxmhK3m1I0ZWDktn5BACZvfXH2PtUbpX_5Cy_rMl_ANyK2Kz9JjFUuVgbW371ucXmn57E95cp9Uf2BTw0RMonQZMOvFADTHMQDnyYimthoPk5bLIsy0MI7pFKLjBDaXfPJsBvOJsbSq2YJTg1KoFx8lk6MoxBUtFSEJyOVpTvd2HzhvBrYixox67_e7Qo6uSMcr6NHgSR4UHu9cyJTg1JqUNhY74UE8x10n7aGlNDN_eU"
        },
        {
            name: "Ghost_Link",
            status: 'away',
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDgz14giDO6u0Feug6Sfs2ltl7EA-OpyYumVN88NNmARd7q9rfy54PqfNxjycdzIxHZAHRfYoelKab9SWxP2lGm0MjqUmWYbAeD_Z4B-yFQ1G5R771JMh_Id9vFtTABp6Fox6UhKrJIE8JCblJaZP9XUmSo4XJCv1p_n8Z-vTReyUaMAukVZAwzgDIepJPpXRsHKgbGPh7b9ju1Cc8wrpzMMWGFeJd44Vt7o4wfDEcsoDDY5SuWpBRRtCDKbhsIgS5_G0A03djgKe4"
        },
        {
            name: "Pulse_Echo",
            status: 'active',
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCR1goKylqgRaVAsg5t8NmfNoM1dAdjk8cL7iS4ZPVnjHuIJxpScKGRo6DO21XofBoxW_47uAd-diwb6u6i0doOxQzN9WnXb4R5p5pcN6hogR3yrZ9rd5R3MktPUGVZOd_Y3AfhAqaeNVz1-4Fmh3Wcrs_OgDa4pflPWPkYsCJOh5xrgdLTPPDke58v0Dz--Q8f_NCPAnttY_yRv6oSDWJ3SeLeI2pYY27BtL20wIRjajJSBV9oubHDDB2QyOaA8RYRocSXUIKof7E"
        }
    ];

    trending = [
        { tag: "#NeonMesh-v2", cat: "Infrastructure", count: "14.2k Transmissions" },
        { tag: "#NeuralLink_Bypass", cat: "Cybernetics", count: "8.7k Transmissions" },
        { tag: "#Silicon_Valley_Credits", cat: "Economy", count: "5.1k Transmissions" }
    ];

    parseContent(content: string) {
        return content.split(' ');
    }
}
