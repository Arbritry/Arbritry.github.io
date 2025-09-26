// 确保整个页面加载完毕后再执行我们的代码
document.addEventListener('DOMContentLoaded', function() {

    // --- Supabase 配置 (无变化) ---
    const SUPABASE_URL = 'https://pduxptbeqfuqbmhrwgfb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdXhwdGJlcWZ1cWJtaHJ3Z2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3Mjc3NTIsImV4cCI6MjA3NDMwMzc1Mn0.cwG8j5fHWP8wMQj2d0pHzyyJ70y0Fh0X1rDu1XrSEXk';

    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    if (!supabaseClient) {
        console.error("Supabase 客户端初始化失败！");
        connectionStatus.textContent = '初始化失败';
        connectionStatus.className = 'connection-status disconnected';
        return;
    }

    // --- 获取页面元素 (无变化) ---
    const groupNumberInput = document.getElementById('groupNumber');
    const toolsInput = document.getElementById('tools');
    const planInput = document.getElementById('plan');
    const showDataFieldsButton = document.getElementById('showDataFields');
    const dataEntrySection = document.getElementById('dataEntrySection');
    const dataTableSection = document.getElementById('dataTableSection');
    const diameterInput = document.getElementById('diameter');
    const circumferenceInput = document.getElementById('circumference');
    const ratioInput = document.getElementById('ratio');
    const addDataButton = document.getElementById('addData');
    const dataBody = document.getElementById('dataBody');
    const connectionStatus = document.getElementById('connectionStatus');

    let experimentData = [];

    // --- 核心应用逻辑 ---

    async function fetchData() {
        const { data, error } = await supabaseClient
            .from('banji') 
            .select('*');

        if (error) {
            console.error('获取数据失败:', error);
            connectionStatus.textContent = '加载错误';
            connectionStatus.className = 'connection-status disconnected';
        } else {
            // 只有在成功获取数据后，才显示“已连接”
            connectionStatus.textContent = '已连接';
            connectionStatus.className = 'connection-status connected';
            experimentData = data;
            updateTable();
        }
    }

    // -----【核心修改】-----
    // 1. 移除了之前所有的 channel 和 .subscribe() 代码
    // 2. 页面加载后，先立即获取一次数据
    fetchData(); 
    // 3. 然后，设置一个定时器，每 5000 毫秒（5秒）就自动调用一次 fetchData 函数
    setInterval(fetchData, 5000);
    // ----------------------

    showDataFieldsButton.addEventListener('click', () => {
        dataEntrySection.style.display = 'block';
        dataTableSection.style.display = 'block';
        showDataFieldsButton.style.display = 'none';
    });

    addDataButton.addEventListener('click', async () => {
        const group = groupNumberInput.value.trim();
        const tools = toolsInput.value;
        const plan = planInput.value;
        const circumference = parseFloat(circumferenceInput.value);
        const diameter = parseFloat(diameterInput.value);
        const ratio = parseFloat(ratioInput.value);

        if (!group || !tools || !plan || isNaN(circumference) || isNaN(diameter) || isNaN(ratio)) {
            alert('请填写完整且有效的实验数据！');
            return;
        }
        if (diameter === 0) {
            alert('直径不能为0！');
            return;
        }
        
        const { error } = await supabaseClient
            .from('banji')
            .upsert({ group, tools, plan, circumference, diameter, ratio });

        if (error) {
            alert('数据提交失败: ' + error.message);
        } else {
            toolsInput.value = '';
            planInput.value = '';
            diameterInput.value = '';
            circumferenceInput.value = '';
            ratioInput.value = '';
            alert('数据提交成功！');
            // 提交成功后，立即手动调用一次 fetchData，让当前用户马上看到更新，而不是等5秒
            fetchData();
        }
    });

    function updateTable() {
        dataBody.innerHTML = '';
        const sortedData = [...experimentData].sort((a, b) => {
            const numA = parseInt(a.group.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(b.group.replace(/[^0-9]/g, '')) || 0;
            return numA - numB;
        });
        
        sortedData.forEach(data => {
            const row = document.createElement('tr');
            const shortPlan = data.plan && data.plan.length > 20 ? data.plan.substring(0, 20) + '...' : (data.plan || '');
            
            row.innerHTML = `
                <td>${data.group}</td>
                <td>${data.tools || ''}</td>
                <td title="${data.plan || ''}">${shortPlan}</td>
                <td>${data.diameter || ''}</td>
                <td>${data.circumference || ''}</td>
                <td><b>${data.ratio || ''}</b></td>
                <td><button class="delete-btn" data-group="${data.group}">删除</button></td>
            `;
            dataBody.appendChild(row);
        });
        
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const groupToDelete = this.getAttribute('data-group');
                if (confirm(`确定要删除 ${groupToDelete} 的数据吗？`)) {
                    const { error } = await supabaseClient
                        .from('banji')
                        .delete()
                        .eq('group', groupToDelete);
                    if (error) {
                        alert('删除失败: ' + error.message);
                    } else {
                        // 删除成功后也立即刷新数据
                        fetchData();
                    }
                }
            });
        });
    }
});
