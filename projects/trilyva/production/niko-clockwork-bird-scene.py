import bpy, math
from mathutils import Vector
from math import sin,cos,pi,radians
sc=bpy.context.scene
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def C(n):
 c=bpy.data.collections.new(n);sc.collection.children.link(c);return c
E=C('SET_Workshop');H=C('CHAR_Niko');B=C('CHAR_ClockworkBird');P=C('PROPS_Story');R=C('RIG_Camera_Lighting')
def mv(o,c):
 for q in list(o.users_collection):q.objects.unlink(o)
 c.objects.link(o);return o
def M(n,c,r=.45,mt=0):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=r;p.inputs['Metallic'].default_value=mt;return m
m={}
for k,v in {
'wall':('Painted_Mint',(.18,.41,.39),.7,0),'cream':('Warm_Cream',(.98,.82,.59),.5,0),'wood':('Oak',(.37,.17,.07),.47,0),'wood2':('Light_Oak',(.68,.4,.17),.4,0),'floor':('Honey_Wood',(.49,.28,.13),.52,0),'sky':('Window_Sky',(.19,.61,.9),.32,0),'hill':('Green_Hills',(.22,.55,.3),.85,0),'leaf':('Leaf_Green',(.1,.4,.16),.8,0),'fur':('Niko_Cinnamon',(.7,.22,.07),.47,0),'fur2':('Niko_Glow_Fur',(.91,.37,.1),.46,0),'muzzle':('Niko_Cream',(.98,.83,.64),.52,0),'patch':('Niko_Mask',(.16,.075,.05),.5,0),'pink':('Ear_Coral',(.86,.31,.29),.5,0),'black':('Eye_Dark',(.035,.018,.02),.2,0),'white':('Eye_Cream',(1,.97,.87),.23,0),'blue':('Teal_Overalls',(.025,.32,.36),.39,0),'seam':('Overalls_Stitch',(.25,.7,.65),.35,0),'brass':('Aged_Brass',(.73,.4,.1),.27,.65),'gold':('Warm_Gold',(.98,.65,.14),.27,.38),'bblue':('Blue_Enamel',(.04,.31,.7),.25,.25),'teal':('Teal_Enamel',(.02,.65,.68),.27,.2),'belly':('Bird_Belly',(1,.76,.35),.35,.08),'iron':('Blue_Steel',(.11,.18,.24),.27,.7),'glow':('Bird_Core_Glow',(.19,.88,1),.2,.05),'flower':('Coral_Flower',(.98,.2,.32),.35,0)}.items():m[k]=M(*v)
def put(o,c,ma,actor=None):
 if ma:o.data.materials.append(ma)
 if o.type=='MESH':
  for f in o.data.polygons:f.use_smooth=True
 mv(o,c)
 if actor is not None:actor.append(o)
 return o
def uv(n,l,s,ma,c,a=None,seg=28,rings=18):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=l);o=bpy.context.object;o.name=n;o.scale=s;return put(o,c,ma,a)
def box(n,l,s,ma,c,be=.04,a=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=l);o=bpy.context.object;o.name=n;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if be:z=o.modifiers.new('Soft bevel','BEVEL');z.width=be;z.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 if ma:o.data.materials.append(ma)
 mv(o,c)
 if a is not None:a.append(o)
 return o
def cyl(n,l,r,d,ma,c,rot=(0,0,0),a=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=r,depth=d,location=l,rotation=rot);o=bpy.context.object;o.name=n
 if ma:o.data.materials.append(ma)
 for f in o.data.polygons:f.use_smooth=True
 z=o.modifiers.new('Edge glint','BEVEL');z.width=min(.022,r*.23);z.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');mv(o,c)
 if a is not None:a.append(o)
 return o
def tor(n,l,r,th,ma,c,rot=(pi/2,0,0),a=None,actor=None):
 if actor is not None:a=actor
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=th,major_segments=32,minor_segments=8,location=l,rotation=rot);o=bpy.context.object;o.name=n;return put(o,c,ma,a)
def cone(n,l,r1,r2,d,ma,c,rot=(0,0,0),a=None):
 bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=r1,radius2=r2,depth=d,location=l,rotation=rot);o=bpy.context.object;o.name=n;return put(o,c,ma,a)
def rod(n,a,b,r,ma,c,parts=None):
 a,b=Vector(a),Vector(b);o=cyl(n,(a+b)/2,r,(b-a).length,ma,c);o.rotation_mode='QUATERNION';o.rotation_quaternion=(b-a).to_track_quat('Z','Y')
 if parts is not None:parts.append(o)
 return o
def curve(n,pts,ma,c,w=.014,a=None):
 d=bpy.data.curves.new(n,'CURVE');d.dimensions='3D';d.resolution_u=16;d.bevel_depth=w;d.bevel_resolution=3;sp=d.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
 for q,p in zip(sp.bezier_points,pts):q.co=p;q.handle_left_type='AUTO';q.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,d);c.objects.link(o)
 if ma:d.materials.append(ma)
 if a is not None:a.append(o)
 return o
def parent(root,parts):
 for o in parts:o.parent=root;o.matrix_parent_inverse=root.matrix_world.inverted()
# Stage
box('ENV_Floor',(0,0,-.18),(16,13,.36),m['floor'],E,.07)
for i in range(17):box('ENV_Floor_Seam_%02d'%i,(-7.5+i*.94,-.1,.006),(.018,11,.01),m['wood2'],E,.002)
box('ENV_BackWall',(0,2.9,3.6),(15,.34,7.2),m['wall'],E,.07);box('ENV_Wainscot',(0,2.65,1.22),(15,.2,1.52),m['wood'],E,.035);box('ENV_Rail',(0,2.48,2.01),(15,.22,.12),m['cream'],E,.02)
for i,x in enumerate([-7,-4.9,-2.8,-.7,1.4,3.5,5.6,7]):box('ENV_Post_%02d'%i,(x,2.59,3.7),(.075,.09,3.05),m['wood2'],E,.018)
box('ENV_Window_Sky',(-4.15,2.58,4.02),(3.42,.06,2.32),m['sky'],E,.02)
for x,z,sx,sz in [(-4.8,3.38,1.17,.49),(-3.5,3.48,1.34,.62),(-4.18,3.7,.96,.38)]:uv('ENV_Window_Hill',(x,2.49,z),(sx,.03,sz),m['hill'],E)
for x,z,s in [(-5.05,4.08,.62),(-3.28,4.31,.51),(-4.4,4.55,.35)]:
 cyl('ENV_Far_Trunk',(x,2.45,z-.25),.05,.55,m['wood'],E);uv('ENV_Far_Canopy',(x,2.44,z),(s,.035,s*.8),m['leaf'],E,seg=20,rings=12)
for x in [-5.93,-4.15,-2.37]:box('ENV_Window_Frame',(x,2.32,4.02),(.12,.18,2.48),m['wood2'],E,.02)
for z in [2.83,4.02,5.21]:box('ENV_Window_Frame',(-4.15,2.3,z),(3.63,.18,.12),m['wood2'],E,.02)
box('ENV_Window_Sill',(-4.15,2.16,2.76),(3.94,.42,.15),m['wood2'],E,.03)
box('ENV_Bench_Top',(1.15,.38,1.05),(5.25,1.48,.2),m['wood2'],E,.07);box('ENV_Bench_Apron',(1.15,.38,.82),(4.8,1.1,.27),m['wood'],E,.03)
for x in [-1.18,3.43]:
 for y in [-.04,.82]:box('ENV_Bench_Leg',(x,y,.42),(.19,.2,.8),m['wood'],E,.025)
box('ENV_Toolboard',(2.3,2.3,2.58),(4,.15,.88),m['wood'],E,.03)
for i in range(8):
 x=.75+i*.43;uv('ENV_Tool_Peg',(x,2.19,2.6),(.03,.03,.03),m['brass'],E,seg=12,rings=8)
 if i%2==0:rod('ENV_Tool_Handle',(x,2.13,2.4),(x,2.13,2.55),.02,m['gold'],E);box('ENV_Tool_Head',(x,2.13,2.58),(.12,.035,.05),m['iron'],E,.01)
# Clock
cyl('PROP_Clock_Case',(4.48,2.38,4.23),.92,.24,m['wood'],P,(pi/2,0,0));cyl('PROP_Clock_Dial',(4.48,2.22,4.23),.78,.08,m['cream'],P,(pi/2,0,0));tor('PROP_Clock_Bezel',(4.48,2.15,4.23),.78,.06,m['brass'],P)
for i in range(12):
 a=i*pi/6;uv('PROP_Clock_Mark',(4.48+sin(a)*.63,2.08,4.23+cos(a)*.63),(.035,.025,.05),m['wood'],P,seg=12,rings=8)
rod('PROP_Clock_Hour_Hand',(4.48,2.05,4.23),(4.22,2.05,4.45),.03,m['wood'],P);rod('PROP_Clock_Minute_Hand',(4.48,2.04,4.23),(4.48,2.04,4.68),.02,m['wood'],P);uv('PROP_Clock_Hub',(4.48,2,4.23),(.075,.04,.075),m['brass'],P)
tor('PROP_Wall_Gear',(5.9,2.43,2.93),.49,.08,m['brass'],P);cyl('PROP_Gear_Hub',(5.9,2.32,2.93),.15,.12,m['iron'],P,(pi/2,0,0))
for i in range(12):
 a=i*pi/6;box('PROP_Gear_Tooth',(5.9+sin(a)*.54,2.31,2.93+cos(a)*.54),(.14,.12,.14),m['gold'],P,.02)
box('ENV_Shelf',(-1.58,2.26,2.35),(2.15,.44,.1),m['wood2'],E,.025)
for i,k in enumerate(['gold','bblue','flower','teal']):
 x=-2.3+i*.5;cyl('PROP_Parts_Tin',(x,2.1,2.55),.14,.27,m[k],P);cyl('PROP_Tin_Lid',(x,2.1,2.7),.15,.035,m['brass'],P)
cyl('PROP_Lamp_Base',(2.86,.34,1.2),.2,.08,m['brass'],P);rod('PROP_Lamp_Arm',(2.86,.34,1.24),(2.98,.34,1.64),.035,m['iron'],P);cyl('PROP_Lamp_Shade',(2.98,.34,1.67),.24,.2,m['gold'],P);uv('PROP_Lamp_Bulb',(2.98,.34,1.55),(.08,.08,.08),m['glow'],P)
box('PROP_Gear_Tray',(.67,-.56,1.19),(1.16,.63,.07),m['wood'],P,.035)
for i in range(7):tor('PROP_Spare_Gear',(.22+i*.14,-.68,1.25),.06,.016,m['gold'],P,rot=(0,0,0))
tor('PROP_Replacement_Spring',(1.18,-.72,1.25),.1,.023,m['brass'],P);uv('PROP_Blue_Feather',(.04,-.7,1.24),(.24,.035,.04),m['bblue'],P)
# Niko
A=[];n=bpy.data.objects.new('RIG_Niko',None);H.objects.link(n);n.location=(-1.95,-.86,0)
uv('NIKO_Shoe_L',(-2.18,-.98,.17),(.26,.35,.15),m['blue'],H,A);uv('NIKO_Shoe_R',(-1.7,-.98,.17),(.26,.35,.15),m['blue'],H,A)
rod('NIKO_Leg_L',(-2.16,-.84,.26),(-2.13,-.8,.68),.13,m['blue'],H,A);rod('NIKO_Leg_R',(-1.72,-.84,.26),(-1.75,-.8,.68),.13,m['blue'],H,A)
uv('NIKO_Body',(-1.95,-.78,1.04),(.56,.39,.62),m['fur'],H,A);uv('NIKO_Belly',(-1.95,-1.12,1.02),(.36,.06,.43),m['muzzle'],H,A);uv('NIKO_Overalls_Bib',(-1.95,-1.18,1.04),(.37,.07,.36),m['blue'],H,A)
for x in [-2.15,-1.75]:uv('NIKO_Button',(x,-1.247,1.29),(.048,.025,.048),m['gold'],H,A)
rod('NIKO_Arm_L',(-2.34,-.84,1.34),(-2.52,-1.02,1),.13,m['fur2'],H,A);rod('NIKO_Arm_R',(-1.57,-.84,1.34),(-1.37,-1.02,1.04),.13,m['fur2'],H,A)
uv('NIKO_Paw_L',(-2.53,-1.04,.99),(.15,.13,.15),m['muzzle'],H,A);uv('NIKO_Paw_R',(-1.37,-1.04,1.03),(.15,.13,.15),m['muzzle'],H,A)
head=uv('NIKO_Head',(-1.95,-.8,1.98),(.72,.56,.66),m['fur'],H,A);uv('NIKO_Face_Highlight',(-1.95,-1.205,2.14),(.47,.13,.32),m['fur2'],H,A)
cone('NIKO_Ear_L',(-2.42,-.78,2.53),.25,.035,.55,m['fur'],H,(0,-.28,0),A);cone('NIKO_Ear_R',(-1.48,-.78,2.53),.25,.035,.55,m['fur'],H,(0,.28,0),A)
uv('NIKO_Inner_Ear_L',(-2.42,-.98,2.55),(.12,.04,.18),m['pink'],H,A);uv('NIKO_Inner_Ear_R',(-1.48,-.98,2.55),(.12,.04,.18),m['pink'],H,A)
for x,s in [(-2.19,'L'),(-1.71,'R')]:
 uv('NIKO_Eye_Patch_'+s,(x,-1.24,2.06),(.2,.075,.255),m['patch'],H,A);uv('NIKO_Eye_White_'+s,(x+.018,-1.302,2.08),(.102,.045,.132),m['white'],H,A);uv('NIKO_Pupil_'+s,(x+.032,-1.343,2.07),(.049,.026,.08),m['black'],H,A);uv('NIKO_Eye_Glint_'+s,(x+.015,-1.367,2.105),(.02,.012,.029),m['white'],H,A,seg=12,rings=8)
uv('NIKO_Muzzle_L',(-2.04,-1.26,1.86),(.235,.13,.16),m['muzzle'],H,A);uv('NIKO_Muzzle_R',(-1.82,-1.26,1.86),(.235,.13,.16),m['muzzle'],H,A);uv('NIKO_Nose',(-1.93,-1.392,1.92),(.08,.05,.05),m['black'],H,A)
curve('NIKO_Smile',[(-1.97,-1.38,1.82),(-1.92,-1.395,1.77),(-1.85,-1.38,1.82)],m['black'],H,.013,A)
for i,(x,y,z,s,k) in enumerate([(-2.35,-.4,.68,.22,'fur'),(-2.66,-.28,.65,.23,'muzzle'),(-2.92,-.2,.78,.24,'fur'),(-3.1,-.18,1,.23,'muzzle'),(-3.12,-.18,1.21,.2,'fur')]):uv('NIKO_Tail_%02d'%i,(x,y,z),(s,s,s),m[k],H,A,seg=22,rings=14)
curve('NIKO_Overall_Seam',[(-2.18,-1.235,.87),(-2.1,-1.24,.78),(-1.8,-1.24,.78),(-1.72,-1.235,.87)],m['seam'],H,.013,A);box('NIKO_Tool_Pocket',(-1.95,-1.257,.93),(.2,.035,.19),m['seam'],H,.02,A);cyl('NIKO_Pocket_Spool',(-1.95,-1.29,1.01),.05,.09,m['gold'],H,(pi/2,0,0),A);parent(n,A)
# Clockwork bird
D=[];b=bpy.data.objects.new('RIG_ClockworkBird',None);B.objects.link(b);b.location=(.45,-.8,0)
uv('BIRD_Body',(.45,-.72,1.35),(.43,.34,.45),m['gold'],B,D);uv('BIRD_Chest',(.45,-1.015,1.27),(.27,.075,.27),m['belly'],B,D);uv('BIRD_Head',(.45,-.78,1.82),(.34,.31,.33),m['brass'],B,D)
for x,s in [(.30,'L'),(.58,'R')]:
 uv('BIRD_Eye_White_'+s,(x,-1.04,1.85),(.1,.06,.12),m['white'],B,D);uv('BIRD_Eye_Pupil_'+s,(x+.018,-1.093,1.85),(.043,.025,.068),m['black'],B,D);uv('BIRD_Eye_Glint_'+s,(x-.002,-1.117,1.88),(.016,.01,.022),m['white'],B,D,seg=12,rings=8)
cone('BIRD_Beak',(.45,-1.17,1.72),.105,.01,.21,m['bblue'],B,(pi/2,0,0),D)
wl=uv('RIG_BIRD_Wing_L',(.08,-.86,1.43),(.28,.1,.31),m['bblue'],B,D);wr=uv('RIG_BIRD_Wing_R',(.82,-.86,1.43),(.28,.1,.31),m['teal'],B,D)
tor('BIRD_Core_Rim',(.45,-1.1,1.3),.13,.032,m['iron'],B,a=D);uv('BIRD_Core_Glow',(.45,-1.135,1.3),(.09,.035,.09),m['glow'],B,D)
for x in [.13,.77]:
 tor('BIRD_Side_Gear',(x,-.99,1.32),.14,.03,m['brass'],B,a=D);cyl('BIRD_Gear_Hub',(x,-1.02,1.32),.05,.035,m['iron'],B,(pi/2,0,0),D)
 for i in range(8):
  a=i*pi/4;box('BIRD_Gear_Tooth',(x+sin(a)*.16,-1,1.32+cos(a)*.16),(.05,.04,.05),m['gold'],B,.009,D)
rod('BIRD_Leg_L',(.28,-.74,1),(.28,-.8,.83),.025,m['iron'],B,D);rod('BIRD_Leg_R',(.62,-.74,1),(.62,-.8,.83),.025,m['iron'],B,D);uv('BIRD_Foot_L',(.28,-.88,.82),(.1,.08,.04),m['bblue'],B,D);uv('BIRD_Foot_R',(.62,-.88,.82),(.1,.08,.04),m['bblue'],B,D)
rod('BIRD_Key_Stem',(.45,-.4,1.29),(.45,-.22,1.29),.032,m['iron'],B,D);tor('BIRD_Key_Loop',(.45,-.19,1.29),.1,.026,m['brass'],B,a=D);parent(b,D)
# Lighting and locked camera
bpy.ops.object.empty_add(type='PLAIN_AXES',location=(0,0,2.3));target=bpy.context.object;target.name='RIG_Focus';mv(target,R)
bpy.ops.object.camera_add(location=(.05,-15.3,6.1));cam=bpy.context.object;cam.name='CAM_main';mv(cam,R);cam.data.lens=47;cam.data.dof.use_dof=True;cam.data.dof.focus_object=target;cam.data.dof.aperture_fstop=8;cam.rotation_euler=(Vector((0,.25,2.22))-cam.location).to_track_quat('-Z','Y').to_euler();sc.camera=cam
bpy.ops.object.light_add(type='SUN',location=(-4,-5,8));key=bpy.context.object;key.name='LGT_key_sun';mv(key,R);key.data.energy=2;key.data.color=(1,.79,.56);key.rotation_euler=(radians(25),radians(-22),radians(-28))
bpy.ops.object.light_add(type='POINT',location=(-3.5,-4.2,4.8));fill=bpy.context.object;fill.name='LGT_fill_window';mv(fill,R);fill.data.energy=560;fill.data.color=(.45,.72,1);fill.data.shadow_soft_size=3.5
bpy.ops.object.light_add(type='POINT',location=(2.7,.7,3));pr=bpy.context.object;pr.name='LGT_practical';mv(pr,R);pr.data.energy=120;pr.data.color=(1,.43,.13);pr.data.shadow_soft_size=1.5
world=bpy.data.worlds.new('WORLD_Soft_Teal') if not bpy.data.worlds else bpy.data.worlds[0];sc.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.18,.27,.31,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.42
sc.render.engine='BLENDER_EEVEE';sc.render.resolution_x=1920;sc.render.resolution_y=1080;sc.render.resolution_percentage=50;sc.render.fps=24;sc.frame_start=1;sc.frame_end=7200;sc.render.image_settings.file_format='PNG';sc.render.film_transparent=False;sc.view_settings.view_transform='AgX'
try:sc.view_settings.look='AgX - Medium High Contrast'
except:pass
sc.render.filepath='//niko_clockwork'
for f,lbl in [(1,'01 / THE QUIET WORKSHOP'),(721,'02 / A BIRD WITHOUT A SONG'),(1441,'03 / THE MISSING SPRING'),(2161,'04 / FOLLOW THE WIND'),(2881,'05 / A CLEVER LITTLE REPAIR'),(3601,'06 / A FIRST FLIGHT'),(4321,'07 / THE SKY OUTSIDE'),(5041,'08 / HOME AGAIN'),(5761,'09 / THE PROMISE'),(6481,'10 / GOODNIGHT, LITTLE BIRD')]:sc.timeline_markers.new(lbl,frame=f)
def kl(o,ss):
 for f,loc in ss:o.location=loc;o.keyframe_insert(data_path='location',frame=f,group='Story Blocking')
def kr(o,ss,axis=1):
 for f,v in ss:o.rotation_euler[axis]=v;o.keyframe_insert(data_path='rotation_euler',index=axis,frame=f,group='Acting')
kl(n,[(1,(-2.4,-.86,0)),(170,(-1.95,-.86,0)),(520,(-1.95,-.86,0)),(721,(-2.15,-.86,0)),(930,(-1.78,-.86,0)),(1200,(-1.95,-.86,0)),(1441,(-2.35,-.86,0)),(1640,(-1.95,-.86,0)),(1900,(-1.8,-.86,0)),(2161,(-2.55,-.86,0)),(2320,(-2.1,-.86,0)),(2700,(-1.9,-.86,0)),(2881,(-2,-.86,0)),(3100,(-1.85,-.86,0)),(3400,(-1.95,-.86,0)),(3601,(-2.25,-.86,0)),(3900,(-1.9,-.86,0)),(4200,(-1.95,-.86,0)),(4321,(-1.8,-.86,0)),(4700,(-1.95,-.86,0)),(5041,(-2.1,-.86,0)),(5400,(-1.95,-.86,0)),(5761,(-2.15,-.86,0)),(6200,(-1.95,-.86,0)),(6481,(-1.95,-.86,0)),(7200,(-1.95,-.86,0))])
kl(b,[(1,(.45,-.8,0)),(240,(.45,-.8,0)),(721,(.45,-.8,-.035)),(1040,(.45,-.8,-.12)),(1200,(.45,-.8,-.14)),(1441,(.45,-.8,-.12)),(1800,(.45,-.8,-.03)),(2161,(.45,-.8,.03)),(2500,(.45,-.8,.08)),(2881,(.45,-.8,.14)),(3200,(.45,-.8,.05)),(3601,(.45,-.8,.18)),(3900,(.45,-.8,.32)),(4200,(.45,-.8,.2)),(4321,(.45,-.8,.2)),(4700,(.45,-.8,.12)),(5041,(.45,-.8,.02)),(5400,(.45,-.8,0)),(5761,(.45,-.8,0)),(6481,(.45,-.8,0)),(7200,(.45,-.8,0))])
kr(head,[(1,0),(170,-.035),(230,.04),(520,0),(721,-.06),(840,.06),(1040,0),(1441,.03),(1560,-.04),(1800,0),(2161,-.03),(2300,.06),(2700,0),(2881,.04),(3100,-.03),(3400,0),(3601,-.04),(3800,.04),(4200,0),(4321,.04),(4600,-.03),(5041,0),(5400,.035),(5761,0),(6481,0),(7200,0)])
for i,w in enumerate([wl,wr]):
 sg=1 if i==0 else -1
 kr(w,[(1,sg*.16),(710,sg*.16),(760,sg*.43),(790,sg*-.15),(820,sg*.42),(850,sg*-.12),(880,sg*.16),(1441,sg*.16),(1480,sg*.5),(1510,sg*-.18),(1540,sg*.46),(1570,sg*-.14),(1600,sg*.16),(2161,sg*.16),(2200,sg*.5),(2230,sg*-.16),(2260,sg*.45),(2290,sg*-.12),(2320,sg*.16),(2881,sg*.16),(2930,sg*.55),(2960,sg*-.2),(2990,sg*.48),(3020,sg*-.14),(3050,sg*.16),(3601,sg*.16),(3660,sg*.68),(3690,sg*-.24),(3720,sg*.6),(3750,sg*-.2),(3780,sg*.16),(4321,sg*.16),(4380,sg*.48),(4410,sg*-.15),(4440,sg*.44),(4470,sg*-.12),(4500,sg*.16),(5041,sg*.16),(5080,sg*.4),(5110,sg*-.12),(5140,sg*.16),(7200,sg*.16)])
sc.frame_set(1);bpy.ops.object.select_all(action='DESELECT');n.select_set(True);bpy.context.view_layer.objects.active=n
result={'story':'Niko and the Clockwork Bird','timeline_seconds':300,'fps':24,'frames':[1,7200],'objects':len(sc.objects),'Niko_parts':len(A),'bird_parts':len(D),'collections':[c.name for c in sc.collection.children],'camera':sc.camera.name,'render_engine':sc.render.engine,'resolution':[1920,1080,50],'animated_controls':[n.name,b.name,head.name,wl.name,wr.name],'chapters':len(sc.timeline_markers)}