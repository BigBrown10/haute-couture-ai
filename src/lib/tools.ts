import { type FunctionDeclaration, SchemaType } from '@google/generative-ai';

/**
 * ADK Tool Definition: update_garment_state
 * Allows Gemini to control the 3D scene's materials and physics.
 */
export const UPDATE_GARMENT_STATE_TOOL: FunctionDeclaration = {
    name: 'update_garment_state',
    description: 'Updates the visual state of the 3D garment, including material properties and physical simulation intensity.',
    parameters: {
        type: 'object',
        properties: {
            material_type: {
                type: 'string',
                description: 'The type of fabric material (e.g., silk, leather, denim, mesh).',
                enum: ['silk', 'leather', 'denim', 'mesh', 'default']
            },
            physics_intensity: {
                type: 'number',
                description: 'The intensity of the physical movement/sway (0.0 to 1.0).'
            },
            glow_color: {
                type: 'string',
                description: 'Hex color for ambient garment glow (optional).'
            }
        },
        required: ['material_type']
    } as any
};

/**
 * ADK Tool Definition: get_archive_data
 * Fetches metadata for 3D assets to inform the conversation.
 */
export const GET_ARCHIVE_DATA_TOOL: FunctionDeclaration = {
    name: 'get_archive_data',
    description: 'Retrieves technical metadata for items in the Zaute collection archive.',
    parameters: {
        type: 'object',
        properties: {
            item_slug: {
                type: 'string',
                description: 'The slug or ID of the collection item.'
            }
        },
        required: ['item_slug']
    } as any
};

/**
 * ADK Tool Definition: generate_outfit
 */
export const GENERATE_OUTFIT_TOOL: FunctionDeclaration = {
    name: 'generate_outfit',
    description: 'Generate a Virtual Try-On image overlay based on a description.',
    parameters: {
        type: 'object',
        properties: {
            prompt: { type: 'string', description: 'Visual description of the outfit.' },
            event_context: { type: 'string', description: 'The occasion for the fit.' }
        },
        required: ['prompt', 'event_context']
    } as any
};

/**
 * ADK Tool Definition: trigger_gesture
 */
export const TRIGGER_GESTURE_TOOL: FunctionDeclaration = {
    name: 'trigger_gesture',
    description: 'Triggers a physical animation gesture on the 3D model.',
    parameters: {
        type: 'object',
        properties: {
            animation: {
                type: 'string',
                description: 'The gesture name (e.g., victory, shrug, taunt).'
            }
        },
        required: ['animation']
    } as any
};

export const TOOLS = [
    UPDATE_GARMENT_STATE_TOOL, 
    GET_ARCHIVE_DATA_TOOL, 
    GENERATE_OUTFIT_TOOL, 
    TRIGGER_GESTURE_TOOL
];

/**
 * Tool Execution Handler
 * Bridges Gemini function calls to the app's internal state.
 */
export async function executeTool(name: string, args: any, callbacks: any) {
    console.log(`[ADK Tool] Executing ${name}:`, args);
    
    switch (name) {
        case 'update_garment_state':
            return { success: true, message: `Garment material updated to ${args.material_type}` };
            
        case 'get_archive_data':
            return {
                id: args.item_slug,
                name: 'Acid Lime Avant-Garde Dress',
                material: 'Synthetic Silk',
                collection: 'Zaute 2026 Core'
            };

        case 'generate_outfit':
            // This will trigger the actual vision pipeline on the server via our existing SocketIO or a new RestAPI
            // For now, we notify the UI to show a placeholder or handle the call
            if (callbacks.onGeneratedOutfit) {
                // We'll implementation the actual server call in the next step
                callbacks.onThinking('✨ Generating outfit via legacy pipeline...');
            }
            return { success: true, message: 'Outfit generation initiated.' };

        case 'trigger_gesture':
            if (callbacks.onAgentGesture) {
                callbacks.onAgentGesture(args.animation);
            }
            return { success: true, gesture: args.animation };
            
        default:
            throw new Error(`Tool ${name} not implemented`);
    }
}
