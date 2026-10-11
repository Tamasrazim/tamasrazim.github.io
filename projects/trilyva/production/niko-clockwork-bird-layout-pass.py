import bpy, math
from mathutils import Vector
from math import sin,cos,pi
sc=bpy.context.scene
ENV=bpy.data.collections["SET_Workshop"]
P=bpy.data.collections["PROPS_Story"]
R=bpy.data.collections["RIG_Camera_Lighting"]
def getcol(n):
 c=bpy.data.collections.get(n)
 if c is None:c=bpy.data.collections.new(n);sc.collection.children.link(c)
 return c
G=getcol("SET_Garden");W=getcol("SET_Windmill_Hill")
def mat(n,c,r=.55,metal=0):
 m=bpy.data.materials.get(n)
 if m is None:
  m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get("Principled BSDF");p.inputs["Base Color"].default_value=(*c,1);p.inputs["Roughness"].default_value=r;p.inputs["Metallic"].default_value=metal
 return m
grass=mat("M_Garden_Grass",(.21,.49,.2),.8)
lightgrass=mat("M_Hill_Grass",(.36,.64,.27),.83)
sky=mat("M_Outdoor_Sky",(.25,.69,.91),.45)
water=mat("M_Story_Creek",(.06,.44,.68),.25,.05)
stone=mat("M_River_Stone",(.43,.52,.52),.68)
bark=mat("M_Garden_Bark",(.29,.13,.055),.7)
leaves=mat("M_Garden_Canopy",(.1,.37,.14),.82)
leaves2=mat("M_Garden_Canopy_Light",(.24,.56,.19),.78)
petal=mat("M_Garden_Flower",(.96,.25,.39),.4)
petal2=mat("M_Garden_Flower_Yellow",(1,.71,.13),.4)
wood=mat("M_Windmill_Wood",(.43,.23,.105),.55)
woodtrim=mat("M_Windmill_Trim",(.8,.53,.24),.48)
roofmat=mat("M_Windmill_Roof",(.56,.19,.11),.48)
def move(o,c):
 for q in list(o.users_collection):q.objects.unlink(o)
 c.objects.link(o);return o
def finish(o,c,ma=None):
 if ma:o.data.materials.append(ma)
 if o.type=="MESH":
  for f in o.data.polygons:f.use_smooth=True
 move(o,c);return o
def box(n,l,d,ma,c,bev=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=l);o=bpy.context.object;o.name=n;o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bev:z=o.modifiers.new("Soft edge bevel","BEVEL");z.width=bev;z.segments=3;o.modifiers.new("Weighted normals","WEIGHTED_NORMAL")
 return finish(o,c,ma)
def uv(n,l,s,ma,c):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=l);o=bpy.context.object;o.name=n;o.scale=s;return finish(o,c,ma)
def cyl(n,l,r,d,ma,c,rot=(0,0,0)):
 bpy.ops.mesh.primitive_cylinder_add(vertices=28,radius=r,depth=d,location=l,rotation=rot);o=bpy.context.object;o.name=n
 z=o.modifiers.new("Soft cylinder edges","BEVEL");z.width=min(.035,r*.18);z.segments=2
 o.modifiers.new("Weighted normals","WEIGHTED_NORMAL")
 return finish(o,c,ma)
def cone(n,l,r1,r2,d,ma,c):
 bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=r1,radius2=r2,depth=d,location=l);o=bpy.context.object;o.name=n;return finish(o,c,ma)
def rod(n,a,b,r,ma,c):
 a,b=Vector(a),Vector(b);o=cyl(n,(a+b)/2,r,(b-a).length,ma,c);o.rotation_mode='QUATERNION';o.rotation_quaternion=(b-a).to_track_quat('Z','Y');return o
def aim_key(obj,frame,loc):
 obj.location=loc;obj.keyframe_insert(data_path="location",frame=frame,group="Story Shot Blocking")

# Garden set at X=22: a readable creek, stepping stones, old trees and flower details.
gx=22
box("GARDEN_Ground",(gx,0,-.19),(17,13,.38),grass,G,.08)
box("GARDEN_BackSky",(gx,2.94,3.55),(16,.12,7),sky,G,.02)
for i,(x,z,sx,sz) in enumerate([(gx-5,1.0,2.7,1.45),(gx,1.22,3.8,1.6),(gx+5,1.05,2.8,1.4)]):
 uv("GARDEN_Hill_%02d"%i,(x,2.7,z),(sx,.15,sz),lightgrass,G)
# A winding shallow creek with visible pale banks and separated stepping stones.
box("GARDEN_Creek",(gx,.34,.015),(12,1.28,.08),water,G,.12)
box("GARDEN_Near_Bank",(gx,-.39,.055),(12,.22,.12),lightgrass,G,.07)
box("GARDEN_Far_Bank",(gx,1.07,.055),(12,.22,.12),lightgrass,G,.07)
for i in range(11):
 x=gx-5+i
 y=.22+sin(i*.9)*.2
 o=uv("GARDEN_Stepping_Stone_%02d"%i,(x,y,.13),(.43,.3,.13),stone,G);o.rotation_euler[2]=sin(i)*.18
 # One bright broken reflection per stone, to make the stream read at thumbnail scale.
 uv("GARDEN_Stone_Glint_%02d"%i,(x-.08,y-.12,.225),(.12,.055,.012),mat("M_Stone_Glint",(.77,.87,.82),.55),G)
# Two carefully shaped trees frame the action.
for idx,(x,y,h) in enumerate([(gx-5.8,1.65,4.3),(gx+5.7,1.85,4.7)]):
 cyl("GARDEN_Tree_Trunk_%d"%idx,(x,y,h*.36),.31,h*.72,bark,G)
 for j,(dx,dz,scal) in enumerate([(-.55,h*.72,1.05),(.05,h*.87,1.25),(.68,h*.7,.97),(.05,h*1.0,.85)]):
  uv("GARDEN_Tree_Canopy_%d_%d"%(idx,j),(x+dx,y-.02,h*.58+dz*.37),(scal,.48,scal*.9),leaves if j%2==0 else leaves2,G)
 # hanging leaf strands add a gentle willow-like silhouette.
 for j in range(4):
  x2=x-.65+j*.42
  rod("GARDEN_Hanging_Twig_%d_%d"%(idx,j),(x2,y-.1,h*1.03),(x2+.06,y-.14,h*.76),.028,leaves,G)
# Foreground daisies; keep them below character eye level so they do not obscure faces.
for i in range(13):
 x=gx-6+i*1.0
 y=-1.9+(i%3)*.17
 z=.23
 rod("GARDEN_Flower_Stem_%02d"%i,(x,y,.02),(x,y,z+.15),.018,leaves,G)
 for j in range(5):
  a=j*2*pi/5
  uv("GARDEN_Flower_Petal_%02d_%d"%(i,j),(x+cos(a)*.09,y-.02,z+.16+sin(a)*.06),(.085,.045,.065),petal if i%2 else petal2,G)
 uv("GARDEN_Flower_Center_%02d"%i,(x,y-.07,z+.16),(.055,.035,.045),woodtrim,G)
# A small mossy log at the edge of the creek is a usable prop and clear story landmark.
cyl("GARDEN_Log",(gx+2,.98,.23),.19,2.1,wood,G,rot=(0,pi/2,0))
uv("GARDEN_Log_Moss",(gx+2,.82,.39),(.67,.16,.08),leaves2,G)

# Hill set at X=44: a small old windmill with a mechanically connected four-blade rotor.
hx=44
box("WIND_Hill_Ground",(hx,0,-.19),(17,13,.38),lightgrass,W,.08)
box("WIND_BackSky",(hx,2.95,3.6),(16,.12,7),sky,W,.02)
for i,(x,z,sx,sz) in enumerate([(hx-5,1.0,3,1.4),(hx,1.1,3.6,1.45),(hx+5,1.15,3,1.5)]):
 uv("WIND_Distant_Hill_%02d"%i,(x,2.72,z),(sx,.15,sz),grass,W)
# A curved path from the foreground toward the windmill.
for i in range(8):
 x=hx-4.5+i*1.2
 y=-2.25+i*.34
 box("WIND_Path_Slab_%02d"%i,(x,y,.025),(.93,.42,.06),stone,W,.06)
# Tower with a faceted timber body, roof, door, windows and support braces.
box("WIND_Tower_Body",(hx+3,1.68,1.68),(1.25,.95,3.35),wood,W,.09)
box("WIND_Tower_Front_Panel",(hx+3,1.16,1.78),(.82,.06,2.5),woodtrim,W,.04)
box("WIND_Tower_Door",(hx+3,1.11,.69),(.43,.07,1.26),bark,W,.06)
uv("WIND_Tower_Door_Knob",(hx+3.15,1.05,.72),(.04,.03,.04),gold,W)
# roof cone with a small finial
cone("WIND_Roof",(hx+3,1.68,3.65),.98,.04,.9,roofmat,W)
uv("WIND_Roof_Finial",(hx+3,1.68,4.14),(.09,.09,.17),woodtrim,W)
# shuttered windows (the face plane points toward the camera).
for x in [hx+2.72,hx+3.28]:
 box("WIND_Window",(x,1.105,2.31),(.16,.07,.33),sky,W,.025)
 box("WIND_Window_Mullion",(x,1.06,2.31),(.025,.025,.35),woodtrim,W,.005)
# rotor hub is the single animation control; sails remain separate editable pieces.
bpy.ops.object.empty_add(type='PLAIN_AXES',location=(hx+3,1.04,4.02))
rotor=bpy.context.object;rotor.name="RIG_Windmill_Rotor";move(rotor,R)
parts=[]
hub=uv("WIND_Rotor_Hub",(hx+3,1.03,4.02),(.17,.09,.17),woodtrim,W)
parts.append(hub)
for i in range(4):
 a=i*pi/2
 # Long narrow spoke and a wider sail near the outer end, all in the camera plane.
 x1=hx+3+cos(a)*.37;z1=4.02+sin(a)*.37
 x2=hx+3+cos(a)*.92;z2=4.02+sin(a)*.92
 sp=rod("WIND_Rotor_Spoke_%d"%i,(hx+3,1.03,4.02),(x2,1.03,z2),.055,woodtrim,W)
 # blade is a slightly tapered board; orientation points along the spoke.
 blade=box("WIND_Rotor_Sail_%d"%i,((x1+x2)/2,.99,(z1+z2)/2),(.30,.12,.73),woodtrim,W,.035)
 blade.rotation_euler[1]=-a
 # orient and parent each blade to the hub, preserving its world position.
 parts.extend([sp,blade])
for o in parts:o.parent=rotor;o.matrix_parent_inverse=rotor.matrix_world.inverted()
# Foreground stones and wildflowers distinguish the hill from the garden.
for i in range(9):
 x=hx-6+i*1.4;y=-2.3+(i%2)*.28
 uv("WIND_Rock_%02d"%i,(x,y,.12),(.29,.22,.15),stone,W)
 for j in range(3):
  uv("WIND_Grass_Tuft_%02d_%d"%(i,j),(x-.12+j*.12,y-.05,.23),(.1,.045,.05),leaves,W)

# Story prop: the same small spring travels from Niko's tray to the hill and back.
spring=bpy.data.objects.get("PROP_Replacement_Spring")
if spring:
 for fr,loc in [
  (1,(1.18,-.72,1.25)),(1439,(1.18,-.72,1.25)),(1440,(1.32,-.72,1.16)),
  (1600,(2.8,-.8,.22)),(1800,(5.1,-.45,.12)),(2159,(7.15,-.25,.12)),(2160,(7.15,-.25,.12)),
  (2161,(gx-1.1,.28,.18)),(2320,(gx+1.7,.18,.12)),(2500,(gx+2.2,.7,.12)),
  (2880,(gx+4.2,1.05,.12)),(2881,(gx+4.2,1.05,.12)),(3599,(gx+5.5,1.3,.12)),
  (3600,(gx+5.5,1.3,.12)),(3601,(hx+3,1.0,.16)),(3900,(hx+2.2,.1,.12)),
  (4320,(hx+2.1,.2,.12)),(4321,(hx+2.1,.2,.12)),(5040,(hx+2.1,.2,.12)),
  (5041,(1.18,-.72,1.25)),(7200,(1.18,-.72,1.25))]:
  spring.location=loc;spring.keyframe_insert(data_path='location',frame=fr,group='Story Prop Continuity')

# Hard cuts between sets: one frame separates the workshop, creek and windmill hill.
cam=bpy.data.objects["CAM_main"];focus=bpy.data.objects["RIG_Focus"]
for fr,x in [(1,.05),(720,.05),(721,.05),(1439,.05),(1440,.05),(1441,.05),(2159,.05),(2160,.05),(2161,gx+.05),(2880,gx+.05),(2881,gx+.05),(3599,gx+.05),(3600,gx+.05),(3601,hx+.05),(4320,hx+.05),(4321,hx+.05),(5039,hx+.05),(5040,hx+.05),(5041,.05),(5760,.05),(5761,.05),(7200,.05)]:
 cam.location.x=x;cam.keyframe_insert(data_path='location',index=0,frame=fr,group='Cut Camera')
for fr,x in [(1,0),(720,0),(721,0),(1441,0),(2160,0),(2161,gx),(2881,gx),(3600,gx),(3601,hx),(4321,hx),(5040,hx),(5041,0),(5761,0),(7200,0)]:
 focus.location=(x,0,2.3);focus.keyframe_insert(data_path='location',frame=fr,group='Focus per set')
# Bring the same actors into each location with matching camera-space blocking.
n=bpy.data.objects["RIG_Niko"];bird=bpy.data.objects["RIG_ClockworkBird"]
n_samples=[(1,(-2.4,-.86,0)),(721,(-2.15,-.86,0)),(1441,(-2.35,-.86,0)),(2160,(-2.55,-.86,0)),(2161,(gx-2.55,-.86,0)),(2320,(gx-2.1,-.86,0)),(2700,(gx-1.9,-.86,0)),(2880,(gx-2,-.86,0)),(2881,(gx-2,-.86,0)),(3600,(gx-2.25,-.86,0)),(3601,(hx-2.25,-.86,0)),(3900,(hx-1.9,-.86,0)),(4200,(hx-1.95,-.86,0)),(4321,(hx-1.8,-.86,0)),(4700,(hx-1.95,-.86,0)),(5040,(hx-1.95,-.86,0)),(5041,(-2.1,-.86,0)),(5400,(-1.95,-.86,0)),(5761,(-2.15,-.86,0)),(7200,(-1.95,-.86,0))]
for fr,loc in n_samples:n.location=loc;n.keyframe_insert(data_path='location',frame=fr,group='Story Blocking')
b_samples=[(1,(.45,-.8,0)),(721,(.45,-.8,-.035)),(1441,(.45,-.8,-.12)),(2160,(.45,-.8,-.03)),(2161,(gx+.45,-.8,.03)),(2320,(gx+.45,-.8,.08)),(2700,(gx+.45,-.8,.18)),(2881,(gx+.45,-.8,.14)),(3600,(gx+.45,-.8,.18)),(3601,(hx+.45,-.8,.18)),(3900,(hx+.45,-.8,.32)),(4200,(hx+.45,-.8,.2)),(4321,(hx+.45,-.8,.2)),(4700,(hx+.45,-.8,.12)),(5040,(hx+.45,-.8,.02)),(5041,(.45,-.8,.02)),(5400,(.45,-.8,0)),(5761,(.45,-.8,0)),(7200,(.45,-.8,0))]
for fr,loc in b_samples:bird.location=loc;bird.keyframe_insert(data_path='location',frame=fr,group='Bird Flight Blocking')
# A simple mouth-open shape for dialogue acting. Rest scale is tiny; cues key it open then closed.
def add_child_shape(name,loc,scale,ma,parent_obj,c):
 o=uv(name,loc,scale,ma,c)
 o.parent=parent_obj;o.matrix_parent_inverse=parent_obj.matrix_world.inverted()
 return o
niko_mouth=add_child_shape("NIKO_Mouth_Open",(-1.92,-1.405,1.80),(.055,.016,.065),mat("M_Niko_Mouth_Inner",(.28,.035,.045),.5),n,H)
bird_mouth=add_child_shape("BIRD_Beak_Open",(.45,-1.19,1.665),(.035,.018,.024),mat("M_Bird_Beak_Inner",(.3,.07,.03),.4),bird,B)
niko_cues=[7,18,34,53,65,79,91,103,119,132,147,159,174,189,203,218,233,248,266,281,294]
for s in niko_cues:
 a=s*24+1;z=(s+max(1.1,2.9))*24
 for fr,scal in [(max(1,a-3),(.001,.001,.001)),(a,(.055,.02,.065)),(int(z),(.055,.02,.065)),(int(z)+3,(.001,.001,.001))]:
  niko_mouth.scale=scal;niko_mouth.keyframe_insert(data_path='scale',frame=fr,group='Dialogue Mouth Shapes')
for s in [106,111,169,185,221,237,255,277,290]:
 a=s*24+1;z=(s+1.25)*24
 for fr,scal in [(max(1,a-2),(.001,.001,.001)),(a,(.035,.018,.035)),(int(z),(.035,.018,.035)),(int(z)+2,(.001,.001,.001))]:
  bird_mouth.scale=scal;bird_mouth.keyframe_insert(data_path='scale',frame=fr,group='Bird Chirp Shapes')
# Rotate blades and give the bird a few distinct wing-action passages.
rotor_samples=[(1,0),(3599,0),(3601,0),(3720,pi/3),(3840,2*pi/3),(3960,pi),(4080,4*pi/3),(4200,5*pi/3),(4321,2*pi),(4440,7*pi/3),(4560,8*pi/3),(4680,3*pi),(4800,10*pi/3),(5040,4*pi),(5041,4*pi),(7200,4*pi)]
for fr,val in rotor_samples:rotor.rotation_euler[1]=val;rotor.keyframe_insert(data_path='rotation_euler',index=1,frame=fr,group='Windmill Rotation')
wl=bpy.data.objects["RIG_BIRD_Wing_L"];wr=bpy.data.objects["RIG_BIRD_Wing_R"]
for i,w in enumerate([wl,wr]):
 sign=1 if i==0 else -1
 for fr,val in [(1,sign*.16),(710,sign*.16),(760,sign*.43),(790,sign*-.15),(820,sign*.42),(850,sign*-.12),(880,sign*.16),(1441,sign*.16),(1480,sign*.5),(1510,sign*-.18),(1540,sign*.46),(1570,sign*-.14),(1600,sign*.16),(2161,sign*.16),(2200,sign*.5),(2230,sign*-.16),(2260,sign*.45),(2290,sign*-.12),(2320,sign*.16),(2881,sign*.16),(2930,sign*.55),(2960,sign*-.2),(2990,sign*.48),(3020,sign*-.14),(3050,sign*.16),(3601,sign*.16),(3660,sign*.68),(3690,sign*-.24),(3720,sign*.6),(3750,sign*-.2),(3780,sign*.16),(4321,sign*.16),(4380,sign*.48),(4410,sign*-.15),(4440,sign*.44),(4470,sign*-.12),(4500,sign*.16),(5041,sign*.16),(5080,sign*.4),(5110,sign*-.12),(5140,sign*.16),(7200,sign*.16)]:
  w.rotation_euler[1]=val;w.keyframe_insert(data_path='rotation_euler',index=1,frame=fr,group='Wing Performance')
sc.frame_set(1)
result={'revision_scene_story':'Niko and the Clockwork Bird','timeline_seconds':300,'fps':24,'total_frames':sc.frame_end,'camera_cut_frames':[2161,3601,5041],'outdoor_sets':['SET_Garden','SET_Windmill_Hill'],'object_count':len(sc.objects),'spring_keys':len(spring.animation_data.action.layers) if spring and spring.animation_data else 0,'markers':len(sc.timeline_markers),'new_sets':[G.name,W.name],'camera':cam.name,'niko_mouth':niko_mouth.name,'bird_mouth':bird_mouth.name}
