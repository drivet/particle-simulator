import { Box3, Vector3 } from 'three';

/**
 * I DON'T WANT TO DO THIS, but I have no idea how we can do bounding box
 * calculations while at the same time ignoring the normal lines sticking
 * out of the little cubes, which feels like the appropriate thing to do.
 *
 * This is directly from the Box3 source code, except for the end,
 * where I filter out the lines from the children
 */
const _vector = /*@__PURE__*/ new Vector3();
const _box = /*@__PURE__*/ new Box3();
Box3.prototype.expandByObject = function(object: any, precise = false): Box3 {
    object.updateWorldMatrix( false, false );
    const geometry = object.geometry;
    if ( geometry !== undefined ) {

        const positionAttribute = geometry.getAttribute( 'position' );
        if ( precise === true && positionAttribute !== undefined && object.isInstancedMesh !== true ) {
            for ( let i = 0, l = positionAttribute.count; i < l; i ++ ) {

                if ( object.isMesh === true ) {
                    object.getVertexPosition( i, _vector );
                } else {
                    _vector.fromBufferAttribute( positionAttribute, i );
                }
                _vector.applyMatrix4( object.matrixWorld );
                this.expandByPoint( _vector );
            }
        } else {
            if ( object.boundingBox !== undefined ) {
                // object-level bounding box
                if ( object.boundingBox === null ) {
                    object.computeBoundingBox();
                }
                _box.copy( object.boundingBox );
            } else {
                // geometry-level bounding box
                if ( geometry.boundingBox === null ) {
                    geometry.computeBoundingBox();
                }
                _box.copy( geometry.boundingBox );
            }

            _box.applyMatrix4( object.matrixWorld );
            this.union( _box );
        }
    }

    // XXX Filter out the lines from the children so they are not considered when
    // calculating bounding boxes
    const children = object.children.filter(c => c.name !== "line");
    for ( let i = 0, l = children.length; i < l; i ++ ) {
        this.expandByObject( children[ i ], precise );
    }

    return this;
}

export { Box3 } from "three";
